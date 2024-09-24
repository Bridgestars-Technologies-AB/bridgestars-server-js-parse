/*

https://github.com/parse-community/parse-server-api-mail-adapter

This is using the mustache template syntax. The most commonly used tags are:

{{double-mustache}}: The most basic form of tag; inserts text as HTML escaped by default.
{{{triple-mustache}}}: Inserts text with unescaped HTML, which is required to insert a URL for example.
Password Reset and Email Verification
By default, the following placeholders are available in the password reset and email verification templates:

{{appName}}: The app name as set in the Parse Server configuration.
{{username}}: The username of the user who requested the email.
{{link}}: The URL to the Parse Server endpoint for password reset or email verification.

*/

import nodemailer from "nodemailer";
import previewEmail from "preview-email";

// const transportOptions = {
//   isSSL: false,
//   port: 587,
//   host: "smtp.gmail.com",
//   user: "bridgestarstechnologies@gmail.com",
//   password: "egetbsdsegdqsvcd",
// }

let mailTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "bridgestarstechnologies@gmail.com",
    pass: "egetbsdsegdqsvcd",
  },
});

export async function sendEmail(data: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  //console.log(mailTransport)
  const mailOptions = {
    from: data.from,
    to: data.to,
    subject: data.subject,
    html: data.html,
  };
  console.log("trying to send email");

  // note that `attachments` will not be parsed unless you use
  // `previewEmail` with the results of `transport.sendMail`
  // e.g. `previewEmail(JSON.parse(res.message));` where `res`
  // is `const res = await transport.sendMail(message);`
  // previewEmail(mailOptions).then(console.log).catch(console.error);

  await mailTransport.sendMail(mailOptions, (error: any, data: any) => {
    if (error) {
      console.log(error.toString());
      throw new Error("Could not send email.");
    } else {
      console.log("Email sent successfully");
      console.log(JSON.stringify(data));
    }
  });
}

export default {
  module: "parse-server-api-mail-adapter",
  options: {
    // The email address from which emails are sent.
    sender: "info@bridgestars.net",

    // The email templates.
    templates: {
      // The template used by Parse Server to send an email for password
      // reset; this is a reserved template name.
      passwordResetEmail: {
        subjectPath: "./files/email/password_reset/subject.txt",
        textPath: "./files/email/password_reset/text.txt",
        htmlPath: "./files/email/password_reset/index.html",
        placeholders: {
          title: "Forgot Your Bridgestars Password?",
          text1: "We received a request to reset your password.",
          text2: "Don't worry, we are here to help you.",
          img: "https://raw.githubusercontent.com/Bridgestars-Technologies-AB/bridgestars-resources-public/main/images/art/sign_in.png",
          img_size: "175px",
          btn_text: "RESET MY PASSWORD &rarr;",
          footer1: "Didn't request a password reset?",
          footer2: "You can safely ignore this email.",
        },
        placeholderCallback: async (data: {
          user: Parse.User;
          locale: any;
          placeholders: object;
        }) => {
          return {
            username: data.user.get("dispName"),
          };
        },
      },
      // The template used by Parse Server to send an email for email
      // address verification; this is a reserved template name.
      verificationEmail: {
        subjectPath: "./files/email/verify_email/subject.txt",
        textPath: "./files/email/verify_email/text.txt",
        htmlPath: "./files/email/verify_email/index.html",
      },
      // A custom email template that can be used when sending emails
      // from Cloud Code; the template name can be chosen freely; it
      // is possible to add various custom templates.
      welcomeEmail: {
        subjectPath: "./files/email/welcome/subject.txt",
        textPath: "./files/email/welcome/text.txt",
        htmlPath: "./files/email/welcome/index.html",
        // Placeholders are filled into the template file contents.
        // For example, the placeholder `{{appName}}` in the email
        // will be replaced the value defined here.
        placeholders: {
          title: "Welcome to Bridgestars!",
          text1:
            "Thank you for wanting to become a part of the team.",
          text2:
            "As soon as Bridgestars is available for testing again we will send you an email.",
          img: "https://raw.githubusercontent.com/Bridgestars-Technologies-AB/bridgestars-resources-public/main/images/art/home_page.png",
          img_size: "300px",
          // btn_text: "Install Bridgestars &rarr;",
          // footer1: "For now only available on Mac and Windows.",
          // link: "https://bridgestars.net/download",
          // footer2: "If you didn't request a password reset, you can safely ignore this email.",
        },
        // Extras to add to the email payload that is accessible in the
        // `apiCallback`.
        extra: {
          // replyTo: 'no-reply@example.com'
        },
        // A callback that makes the Parse User accessible and allows
        // to return user-customized placeholders that will override
        // the default template placeholders. It also makes the user
        // locale accessible, if it was returned by the `localeCallback`,
        // and the current placeholders that will be augmented.
        placeholderCallback: async (data: {
          user: Parse.User;
          locale: any;
          placeholders: object;
        }) => {
          return {
            username: data.user.get("dispName"),
          };
        },
        // A callback that makes the Parse User accessible and allows
        // to return the locale of the user for template localization.
        localeCallback: async (user: Parse.User) => {
          return; //user.get('locale');
        },
      },
      downloadEmail: {
        subjectPath: "./files/email/welcome/subject.txt",
        textPath: "./files/email/welcome/text.txt",
        htmlPath: "./files/email/welcome/index.html",
        // Placeholders are filled into the template file contents.
        // For example, the placeholder `{{appName}}` in the email
        // will be replaced the value defined here.
        placeholders: {
          title: "Welcome to Bridgestars!",
          text1:
            "Thank you for wanting to become a part of the team. Bridgestars is currently available only as a technical preview!",
          // text2: "Don't worry, we are here to help you.",
          img: "https://raw.githubusercontent.com/Bridgestars-Technologies-AB/bridgestars-resources-public/main/images/art/home_page.png",
          img_size: "300px",
          btn_text: "Install Bridgestars &rarr;",
          footer1: "For now only available on Mac and Windows.",
          link: "https://bridgestars.net/download",
          // footer2: "If you didn't request a password reset, you can safely ignore this email.",
        },
        // Extras to add to the email payload that is accessible in the
        // `apiCallback`.
        extra: {
          // replyTo: 'no-reply@example.com'
        },
        // A callback that makes the Parse User accessible and allows
        // to return user-customized placeholders that will override
        // the default template placeholders. It also makes the user
        // locale accessible, if it was returned by the `localeCallback`,
        // and the current placeholders that will be augmented.
        placeholderCallback: async (data: {
          user: Parse.User;
          locale: any;
          placeholders: object;
        }) => {
          return {
            username: data.user.get("dispName"),
          };
        },
        // A callback that makes the Parse User accessible and allows
        // to return the locale of the user for template localization.
        localeCallback: async (user: Parse.User) => {
          return; //user.get('locale');
        },
      },
    },
    // The asynchronous callback that contains the composed email payload to
    // be passed on to an 3rd party API and optional meta data. The payload
    // may need to be converted specifically for the API; conversion for
    // common APIs is conveniently available in the `ApiPayloadConverter`.
    apiCallback: async (data: { payload: any; locale: any }) => {
      data.payload.from = "Bridgestars <" + data.payload.from + ">";
      await sendEmail(data.payload);
    },
  },
};
