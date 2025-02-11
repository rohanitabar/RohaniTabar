import React from 'react';
import './home.css';
import Footer from './footer';

const About = () => {
    return (
      <>
        <h1 className="title">درباره من</h1>
        <br />
        <div className="description-container">
          <p className="description mr-2 ml-2">
            من عباس روحانی تبار یه پسر ١٨ ساله ام که دیپلم ریاضی داره و علاقه
            مند به یادگیری و برنامه نویسیه . من از بچگی علاقه زیادی به کامپیوتر
            داشتم، همین علاقه باعث شد که من وقتی با برنامه نویسی آشنا شدم تصمیم
            بگیرم تا به این حوزه وارد بشم و شروع به یادگیری کنم و مهارت هایی رو
            بدست بیارم .
          </p>
        </div>
      </>
    );
}
 
export default About;