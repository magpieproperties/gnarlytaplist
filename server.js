require('dotenv').config()

const puppeteer = require('puppeteer');
const twilio = require('twilio');
const fs = require('fs');
const nodemailer = require('nodemailer');
const converter = require('json-2-csv');

const { TWILIOACCOUNTSID, TWILIOAUTHTOKEN, TWILIOTO, TWILIOFROM } = process.env;
const twilioClient = new twilio(TWILIOACCOUNTSID, TWILIOAUTHTOKEN);

let {google} = require('googleapis');
let OAuth2 = google.auth.OAuth2;

let oauth2Client = new OAuth2(
	//ClientID
	process.env.GMAIL_CLIENTID,
	
	//Client Secret
	process.env.GMAIL_SECRET,
	
	//Redirect URL
	"https://developers.google.com/oauthplayground"
);


async function getGnarlyTapData(){

const beerNameSelector = '#menu-2492 > div:nth-child(3) > div.section-items-container > div.item-bg-color.menu-items-container.padding-left.padding-right > div:nth-child(INDEX) > div > div.beer-details.item-title-color > p > a';
const beerTypeSelector ='#menu-2492 > div:nth-child(3) > div.section-items-container > div.item-bg-color.menu-items-container.padding-left.padding-right > div:nth-child(INDEX) > div > div.beer-details.item-title-color > p > span';
const tapNumberSelector = '#menu-2492 > div:nth-child(3) > div.section-items-container > div.item-bg-color.menu-items-container.padding-left.padding-right > div:nth-child(INDEX) > div > div.beer-details.item-title-color > p > a > span'	;
const beerBrewerNameSelector ='#menu-2492 > div:nth-child(3) > div.section-items-container > div.item-bg-color.menu-items-container.padding-left.padding-right > div:nth-child(INDEX) > div > div.beer-details.item-title-color > div.item-meta.item-title-color > div.brewery-name-hideable > span > a';
const beerABVSelector ='#menu-2492 > div:nth-child(3) > div.section-items-container > div.item-bg-color.menu-items-container.padding-left.padding-right > div:nth-child(INDEX) > div > div.beer-details.item-title-color > div.item-meta.item-title-color > div.abv-hideable > span';

const browser = await puppeteer.launch({headless:true ,args:['--ignore-certificate-errors','--disable-gpu','--window-size=800,600',"--proxy-server='direct://'",'--proxy-bypass-list=*']},{sloMo: 350}, {ignoreHTTPSErrors: true});
const page = await browser.newPage();
const navigationPromise = page.waitForNavigation();
await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/67.0.3372.0 Safari/537.36');

//await page.goto('http://www.thegnarlybarley.com/beermenu',{waitUntil: 'networkidle0'});

await page.goto('http://www-thegnarlybarley-com.filesusr.com/html/c62e27_986a9fdfdff3bf8292b843ffacfd8ac9.html',{waitUntil: 'networkidle0'});

try
{
  await navigationPromise;
}
catch(err){
  console.log(err);
}

await page.waitForSelector('#menu-2492');

//await page.screenshot({path: 'gnarlyData.png', fullPage: true});

var tapData = [];

var tapString;

  for (let i = 1; i <= 16 ; i++) 
  {
		//let tapNumber = tapNumberSelector.replace("INDEX", i);
    let tapName= beerNameSelector.replace("INDEX",i);
    let tapType = beerTypeSelector.replace("INDEX",i);
    let tapBrewName = beerBrewerNameSelector.replace("INDEX",i);
    let tapABV = beerABVSelector.replace("INDEX",i);
		
		let beerName = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
      return element? element.textContent.replace(/\s{2,}/g,' '):null;
      }, tapName);

      let beerMakerName = await page.evaluate((sel) => {
        let element = document.querySelector(sel);
         return element? element.textContent.replace(/\s{2,}/g,' '):null;
         }, tapBrewName);

         let beerABV = await page.evaluate((sel) => {
          let element = document.querySelector(sel);
           return element? element.textContent.replace(/\s{2,}/g,' '):null;
           }, tapABV);
	  

      let beerType = await page.evaluate((sel) => {
        let element = document.querySelector(sel);
         return element? element.innerHTML:null;
         }, tapType);
	  
      //console.log(beerName);
      //console.log("Type: " + beerType);
      //console.log("Brewer: " + beerMakerName);
      //console.log(beerABV);

      //tapData.push(beerName+"\n");
      //tapData.push("Type: " + beerType+"\n");
      //tapData.push("Brewer: " + beerMakerName+"\n");
      //tapData.push(beerABV+"\n");
      
      var json = {'BeerName': beerName,'Type': beerType,'Brewer': beerMakerName,'ABV': beerABV};

      //tapData.push(json);

      tapString = beerName + "\nType: "+ beerType+ "\nBrewer: " + beerMakerName + "\n"+beerABV+"\n";

      tapData.push(tapString);
  }

 // for (let i = 0; i <= 15 ; i++) 
 // {

 //console.log(tapData[i].toString());

 // }


tapData.join("");

console.log(tapData.toString());
 //sendTextMessage(tapData);
 sendTheEmail(tapData);

  browser.close();


}

 const sendTextMessage = (status) => {
    const msg = {
      to: TWILIOTO,
      from: TWILIOFROM,
      body: `Gnarly Tap List: '${status}'`,
   };
 
   twilioClient.messages.create(msg).catch(console.error);
  };

function sendTheEmail(fileName)
{
	
// Set the refresh token
oauth2Client.setCredentials({
	refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

//Initialize an access token variable
let accessToken = "";

//Get the access token
oauth2Client.refreshAccessToken(function(err,tokens)
{
if(err) 
{
    console.log(err);
  } 
  else 
  {
    console.log(accessToken);
  }
	accessToken = tokens.access_token;
});

var smtpTransport = nodemailer.createTransport({
    host:"smtp.gmail.com",
	port: 465,
	secure: true,
	auth:{
      type: "OAuth2",
      user: process.env.GMAIL_USERNAME,
	  clientId: process.env.GMAIL_CLIENTID,
	  clientSecret: process.env.GMAIL_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
	  accessToken: accessToken
    }
});

var mailOptions = {
  from: process.env.GMAIL_USERNAME,
  to: "Kornarmy@gmail.com",
  subject: "Gnarly Barley Tap List",
  generateTextFromHTML: false,
  text: "Gnarly Barley Rocks Orlando Craft Beer!" +"\n"+ fileName
  
};

smtpTransport.sendMail(mailOptions, function(error, response) {
  if (error) {
    console.log(error);
  } else {
    console.log(response);
  }
  smtpTransport.close();
});
	
};

getGnarlyTapData();