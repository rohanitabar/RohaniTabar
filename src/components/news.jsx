import React from "react";
import profile from "./Abbas profile.png";
import "./blog.css";
import { Link } from "react-router-dom";
import Footer from "./footer";
const News = () => {
  return (
    <div
      style={{ display: "flex", direction: "rtl", justifyContent: "center" }}
      className="row"
    >
      <div className="blog-card col-12">
        <img
          src="https://akm-img-a-in.tosshub.com/businesstoday/images/story/202501/679a4e284a5b7-deepseeks-rapid-success-has-not-only-rattled-global-ai-players-but-also-ignited-a-fierce-battle-at-294954805-16x9.jpg?size=1200:675"
          alt="Qwen"
          className="card-img"
        />
        <div className="blog-card-body">
          <h3 className="card-title">Qwen، رقیب جدی ChatGPT</h3>
          <p className="description text-muted">
            کمپانی علی بابا هوش مصنوعی Qwen را اخیرا معرفی کرده است؛ جدیدترین
            مدل زبان هوش مصنوعی که برای پردازش متن، تصویر و حتی صدا طراحی شده
            است. چه به دنبال یک چت‌بات هوش مصنوعی باشید، چه یک تولید کننده محتوا
            یا ابزاری برای پردازش داده‌ها، Qwen 2.5 طیف وسیعی از ویژگی‌ها را
            ارائه می‌دهد. توی این پست میخوام Qwen 2.5 و سابقه اش رو بررسی کنم .
          </p>
          <div className="footer-card">
            <div className="profile-container">
              <img src={profile} alt="Abbas" className="profile" />
              <h3 className="name">عباس روحانی تبار</h3>
            </div>
            <div className="btn-container">
              <Link>
                <button className="btn contnue">ادامه مطلب ...</button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="blog-card col-12">
        <img
          src="https://source.washu.edu/app/uploads/2025/02/deepresize1-1024x684.jpg"
          alt="deepseek"
          className="card-img"
        />
        <div className="blog-card-body">
          <h3 className="card-title">
            همه چیز درباره deepseek، هوش مصنوعی چینی که جهان را منفجر کرد
          </h3>
          <p className="description text-muted">
            deepsek یه AI است که به تازگی توسط شرکتی چینی منتشر شده و از AI های
            قدرت مندی مثل Chat-gpt و Open AI عملکرد بهتری داشته . توی این پست
            میخوام درباره این AI عجیب بیشتر صحبت کنم .
          </p>
          <div className="footer-card">
            <div className="profile-container">
              <img src={profile} alt="Abbas" className="profile" />
              <h3 className="name">عباس روحانی تبار</h3>
            </div>
            <div className="btn-container">
              <Link>
                <button className="btn contnue">ادامه مطلب ...</button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="blog-card col-12">
        <img
          src="https://www.securitymagazine.com/ext/resources/2021/12/13/AI-news.jpg?height=635&t=1639404760&width=1200"
          alt="AI news"
          className="card-img"
        />
        <div className="blog-card-body">
          <h3 className="card-title">اخبار هوش مصنوعی(AI)</h3>
          <p className="description text-muted">
            از پیشرفت های خیره کننده ی ChatGPT تا ربات های انسان نما که مرزهای
            علم را جابه جا میکنند، هرآنچه در دنیای هوش مصننوعی میگذرد، در اینجا
            بخوانید.
          </p>
          <div className="footer-card">
            <div className="profile-container">
              <img src={profile} alt="Abbas" className="profile" />
              <h3 className="name">عباس روحانی تبار</h3>
            </div>
            <div className="btn-container">
              <Link>
                <button className="btn contnue">ادامه مطلب ...</button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  );
};

export default News;
