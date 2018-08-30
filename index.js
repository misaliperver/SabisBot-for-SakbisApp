var app = require('express')();
var webdriver  = require('selenium-webdriver');
var By = require('selenium-webdriver').By;
var until = require('selenium-webdriver').until;

var Matris = require('./app_sever/model/dersprogrami');
var mongo = require('mongodb');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/sakbisapp');
var db = mongoose.connection;

var sabisurl = "https://sabis.sakarya.edu.tr/tr/Login?return=http%3a%2f%2fsabis.sakarya.edu.tr%2f"

var SABISUSERS = [];


app.get('/:user', function(req, res){
    let user = req.params.user;
    let username = user.split(' ')[0];
    let password = user.split(' ')[1];
    if(username.length != 10){
        res.json('Uygun Bir Kullanıcı Adı Değil.')
    }else{
        if(password === "" || password === null){
            res.json('Uygun Bir Şifre Değil.')
        }else{
            SABISUSERS.push({username:username, password:password});
            res.json('Sıraya Eklendi')
        }
    }
})
app.use(function(req, res, next){ // 404 - ErorrPage
    res.status(404);	
    // respond with html page
    if (req.accepts('html')) {
        res.json('404');
        return;
    }	
    // respond with json
    if (req.accepts('json')) {
    res.json({ error: 'Not found' });
    return;
    }	
    // default to plain-text. send()
    res.json('Not found');
});

app.listen(3000);

var FLAG = false;
setInterval(loop, 5000);

function loop(){
    if(FLAG==false){
        SABISUSERS.forEach(function(user){
            SABISUSERS.pop();
           let driver = new webdriver.Builder().forBrowser('chrome').build();
            driver.manage().window();
            driver.manage().deleteAllCookies();

            FLAG = true;
            driver.get(sabisurl).then(function(){
                return driver.findElement(By.name('UserName'));
            }).then(function(UserName){
                return UserName.sendKeys(user.username);
            }).then(function(){
                return driver.findElement(By.name('Password'));
            }).then(function(Password){
                return Password.sendKeys(user.password);
            }).then(function(){
                return driver.findElement(By.id('btnLogin'))
            }).then(function(loginBtn) {
                return loginBtn.submit()
            }).then(function() {
                return driver.wait(until.elementLocated(By.className('tiles-footer ana-tiles')), 10000, 'Sabis Ana Sayfası Açılamadı');
            }).then(function(a) {
                console.log(a);
                return driver.get('https://ogr.sakarya.edu.tr/Ders/Ders/Program')
            }).then(function() {
                return driver.wait(until.elementLocated(By.className('k-state-default k-view-agenda')), 10000, 'Dersprogramlarını Görüntülediğimiz Sayfa Açılmadı');
            }).then(function(){
                return driver.findElement(By.className('k-state-default k-view-agenda'))
            }).then(function(agenta){
                return agenta.click()
            }).then(function(){
                return driver.wait(until.elementLocated(By.className('k-scheduler-datecolumn')), 10000, 'Agenta Tuşuna tıklayamadık.');
            }).then(function(tag){
                driver.findElement(By.xpath('//*[@id="scheduler"]/table')).then(function(HTMLsource){
                    HTMLsource.getText().then(function(data){
                        var dizi = data.split(/\n/)
                        var dersProgrami = {}; var birders = ""; var sayac = 0;
                        var gunmu = false;     var yilmi = false;
                        for(var k in dizi){
                            if(k>0){
                                if(dizi[k].length == 2){//Gün tarihi 2 rakamlı
                                    sayac =0;
                                    console.log(dizi[k]);
                                    gunmu=true;
                                }else if(gunmu && yilmi){//Yıl kısmını almamam lazım
                                    console.log(dizi[k]);
                                    gunmu=false; yilmi=false;
                                }else if(dizi[k]==="Pazartesi" || dizi[k]==="Salı" || dizi[k]==="Çarşamba" || dizi[k]==="Perşembe" ||dizi[k]==="Cuma"){
                                    yilmi = true;
                                    hangigun = dizi[k];
                                    dersProgrami[dizi[k]] = [];
                                }else if(dizi[k].substring(0,5) === "Mekan"){//Mekan kısmını almamam lazım
                                    console.log(dizi[k]);
                                }
                                else if(dizi[k].length == 11 && dizi[k][2]===':' && dizi[k][5]==='-' && dizi[k][8]===':'){
                                    sayac++;
                                    birders += dizi[k] + "  ";
                                }
                                else{
                                    birders += dizi[k];
                                    dersProgrami[hangigun].push(birders);
                                    birders = "";
                                }  
                            }               
                        }
                        return dersProgrami;
                    }).then(function(xdersProgrami){
                        var matris = new Array(5);
                        for(let v=0; v<5; v++){
                            matris[v] = new Array(16);
                            for(let f=0; f<16; f++){
                                matris[v][f] = false
                            }
                        }
                        var aciklama = new Array(5);
                        for(let v=0; v<5; v++){
                            aciklama[v] = new Array(16);
                            for(let f=0; f<16; f++){
                                aciklama[v][f] = ""
                            }
                        }
                        return {xmatris:matris, xdersProgrami: xdersProgrami, aciklama:aciklama}
                    }).then(function(xdatas){
                        xdatas.xdersProgrami['Pazartesi'].forEach(function(xders){
                            let xsaat = xders.split('  ')[0];
                            let bassaat = parseInt(xsaat.substring(0,2));
                            let sonsaat = parseInt(xsaat.substring(6,8));
                            for(let c=(bassaat-7); c<(sonsaat-7); c++){
                                xdatas.xmatris[0][c] = true;
                                xdatas.aciklama[0][c] = xders.split('  ')[1];
                            }
                        })
                        xdatas.xdersProgrami['Salı'].forEach(function(xders){
                            let xsaat = xders.split('  ')[0];
                            let bassaat = parseInt(xsaat.substring(0,2));
                            let sonsaat = parseInt(xsaat.substring(6,8));
                            for(let c=(bassaat-7); c<(sonsaat-7); c++){
                                xdatas.xmatris[1][c] = true;
                                xdatas.aciklama[1][c] = xders.split('  ')[1];
                            }
                        })
                        xdatas.xdersProgrami['Çarşamba'].forEach(function(xders){
                            let xsaat = xders.split('  ')[0];
                            let bassaat = parseInt(xsaat.substring(0,2));
                            let sonsaat = parseInt(xsaat.substring(6,8));
                            for(let c=(bassaat-7); c<(sonsaat-7); c++){
                                xdatas.xmatris[2][c] = true;
                                xdatas.aciklama[2][c] = xders.split('  ')[1];
                            }
                        })
                        xdatas.xdersProgrami['Perşembe'].forEach(function(xders){
                            let xsaat = xders.split('  ')[0];
                            let bassaat = parseInt(xsaat.substring(0,2));
                            let sonsaat = parseInt(xsaat.substring(6,8));
                            for(let c=(bassaat-7); c<(sonsaat-7); c++){
                                xdatas.xmatris[3][c] = true;
                                xdatas.aciklama[3][c] = xders.split('  ')[1];
                            }
                        })
                        xdatas.xdersProgrami['Cuma'].forEach(function(xders){
                            let xsaat = xders.split('  ')[0];
                            let bassaat = parseInt(xsaat.substring(0,2));
                            let sonsaat = parseInt(xsaat.substring(6,8));
                            for(let c=(bassaat-7); c<(sonsaat-7); c++){
                                xdatas.xmatris[4][c] = true;
                                xdatas.aciklama[4][c] = xders.split('  ')[1];
                            }
                        })
                        var msg="";
                        Matris.findOne({username: user.username}, function (err, dersProgrami) {
                            if(err) throw err;
                            if(dersProgrami){
                                Matris.findOneAndUpdate({username: user.username}, {
                                    matris: xdatas.xmatris,
                                    }, function(err, rawResponse) {
                                    if (err){ msg= 'Güncellenemedi';  throw err;}
                                    else {msg= 'Güncelleme başarılı'; }
                                    console.log(msg);
                                    });
                            }else{
                                var newDersProgrami = new Matris({
                                    matris: xdatas.xmatris,
                                    aciklama:xdatas.aciklama,
                                    private: false,
                                    username: user.username,
                                    date: Date.now()
                                });
                                Matris.createDersProgrami(newDersProgrami, function (err, callbackDersProgrami) {
                                    if (err){ msg = 'Yenisi oluşturululamadı'; throw err; }
                                    else {msg= 'Yeni kayıt oluşturuldu.'; }
                                });
                                console.log(msg);
                            }
                        });
                        console.log(xdatas.xmatris)
                        driver.quit();
                    }).then(function(){
                        FLAG = false;
                    })
                    
                })
            })
        })
    }    
}
