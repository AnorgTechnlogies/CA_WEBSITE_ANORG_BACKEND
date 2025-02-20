import transport from "./sendMail.js"

const sendEmailNotification=async(toEmail,subject, message)=>{
    let info= await transport.sendMail({
        // from:"admin@psycortex.in",
           from:process.env.NODEMAILER_SENDING_EMAIL_ADDRESS,
        to: toEmail, // Recipient's email address
        subject: subject, // Email subject
        text: message,   
      });
}
export default sendEmailNotification;