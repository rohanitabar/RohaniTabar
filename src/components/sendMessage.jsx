// import React from 'react';
// import './home.css';
// import
// const SendMessage = () => {
//     return (
//       <>
//         <div className="message-form send-Email">
//             <form ref={form} onSubmit={sendEmail}>
//                 <label>Name</label>
//                 <input type="text" name="user_name" />
//                 <label>Email</label>
//                 <input type="email" name="user_email" />
//                 <label>Message</label>
//                 <textarea name="message" />
//                 <input type="submit" value="Send" />
//             </form>
//           <button type="submit" className="mb-2 send-btn">
//             ارسال
//           </button>
//         </div>
//       </>
//     );
// }
 
// export default SendMessage;

import React, { useRef } from "react";
import emailjs from "@emailjs/browser";

 const SendMessage = () => {
  const form = useRef();

  const sendEmail = (e) => {
    e.preventDefault();

    emailjs
      .sendForm("service_youb6lk", "template_n0o9que", form.current, {
        publicKey: "g5QBZGfffYOFr_3XS",
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
    <form ref={form} onSubmit={sendEmail}>
             <div className="message-form send-Email">
             <form ref={form} onSubmit={sendEmail}>
                 <input type="text" name="user_name" className="message-form mb-2" placeholder="نام "/>
                 <input type="email" name="user_email" className="message-form mb-2" placeholder="ایمیل "/>
                 <textarea name="message" className="message-form mb-2" placeholder="پیام شما"/>
             </form>
           <button type="submit" className="mb-2 send-btn">
             ارسال
           </button>
         </div>
    </form>
  );
};

export default SendMessage;