import nodemailer from 'nodemailer';
import {config} from 'dotenv';

config({ path:'./config/config.env' });
console.log(process.env.NODEMAILER_SERVICE,"this is service");
// process.env.NODEMAILER_SENDING_EMAIL_ADDRESS
const transport = await nodemailer.createTransport({
    // service: "gmail",
    // service: process.env.NODEMAILER_SERVICE,
    host:process.env.NODEMAILER_SERVICE_HOST,  
    secure:true,
    port: 465,
    secureConnection: false, 
    tls: {
      ciphers:'SSLv3'
  },
  requireTLS:true,
  

  port: 465,
    debug: true,

    auth: {
      // user: "admin@psycortex.in ",
      user: process.env.NODEMAILER_SENDING_EMAIL_ADDRESS,
      // pass: "Psycortex@9$",
      pass:  process.env.NODEMAILER_SENDING_EMAIL_PASSWORD,
    },
  });

export default transport;