import React, { useRef } from "react";
import emailjs from "@emailjs/browser";

export const SendMessage = () => {
  const form = useRef();

  const sendEmail = (e) => {
    e.preventDefault();

    emailjs
      .sendForm("service_youb6lk", "template_n0o9que", form.current, {
        publicKey: "qvtsJVqNcyQaHvEhm",
      })
      .then(
        () => {
          console.log("SUCCESS!");
        },
        (error) => {
          console.log("FAILED...", error.text);
        }
      );
  };

  return (
    <form ref={form} onSubmit={sendEmail} className="send-Email message-form mb-3 ">
      <input type="text" name="user_name" className="message-form mb-3 mt-3" placeholder="نام شما" />
      <input type="email" name="user_email" className="message-form mb-3" placeholder="ایمیل " />
      <textarea name="message" className="message-form mb-3" placeholder="پیام شما"/>
      <input type="submit" className="send-btn mb-3" value="ارسال" />
    </form>
  );
};
