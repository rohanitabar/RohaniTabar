import React from 'react';
import profile from "./Abbas profile.png";
import './home.css';
import { Link } from "react-router-dom";
const PopularPosts = () => {
    return (
      <>
        <h1 className="title">اخبار جدید</h1>
        <br />
        <br />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            direction: "rtl",
          }} className='row'
        >
          <div className="card text-bg-light mb-3 col-xs-12 col-md-4" style={{ maxWidth: "18rem" }}>
            <img
              src="https://akm-img-a-in.tosshub.com/businesstoday/images/story/202501/679a4e284a5b7-deepseeks-rapid-success-has-not-only-rattled-global-ai-players-but-also-ignited-a-fierce-battle-at-294954805-16x9.jpg?size=1200:675"
              class="card-img-top"
              alt="Qwen"
            />
            <div className="card-body">
              <h5 className="card-title">Qwen، رقیب جدی ChatGPT</h5>
              <p className="card-text">
                کمپانی علی بابا هوش مصنوعی Qwen را اخیرا معرفی کرده است؛
                جدیدترین مدل زبان هوش مصنوعی که برای پردازش متن، تصویر و حتی صدا
                طراحی شده است. چه به دنبال یک چت‌بات هوش مصنوعی باشید، چه یک
                تولید کننده محتوا یا ابزاری برای پردازش داده‌ها، Qwen 2.5 طیف
                وسیعی از ویژگی‌ها را ارائه می‌دهد. توی این پست میخوام Qwen 2.5 و
                سابقه اش رو بررسی کنم .
              </p>
            </div>
            <div className="btn-container mb-2">
              <Link to='/qwenai'>
                <button className="btn contnue">ادامه مطلب ...</button>
              </Link>
            </div>
            <div className="card-footer">
              <img src={profile} alt="Abbas" className="profile" />
              <h4 className="name">
                عباس روحانی تبار
              </h4>
            </div>
          </div>

          <div class="card text-bg-light mb-3 col-xs-12 col-md-4" style={{ maxWidth: "18rem" }}>
            <img
              src="https://source.washu.edu/app/uploads/2025/02/deepresize1-1024x684.jpg"
              class="card-img-top"
              alt="deepseek"
            />
            <div class="card-body">
              <h5 class="card-title">
                همه چیز درباره deepseek، هوش مصنوعی چینی که جهان را منفجر کرد
              </h5>
              <p class="card-text">
                deepsek یه AI است که به تازگی توسط شرکتی چینی منتشر شده و از AI
                های قدرت مندی مثل Chat-gpt و Open AI عملکرد بهتری داشته . توی
                این پست میخوام درباره این AI عجیب بیشتر صحبت کنم .
              </p>
            </div>
            <div className="btn-container mb-2">
              <Link to='/deepseekai'>
                <button className="btn contnue">ادامه مطلب ...</button>
              </Link>
            </div>
            <div class="card-footer">
              <img src={profile} alt="Abbas" className="profile" />
              <h4 className="name">
                عباس روحانی تبار
              </h4>
            </div>
          </div>

          <div class="card text-bg-light mb-3 col-xs-12 col-md-4" style={{ maxWidth: "18rem" }}>
            <img
              src="https://www.securitymagazine.com/ext/resources/2021/12/13/AI-news.jpg?height=635&t=1639404760&width=1200"
              alt="AI news"
              class="card-img-top"
            />
            <div class="card-body">
              <h5 className="card-title">اخبار هوش مصنوعی(AI)</h5>

              <p class="card-text">
                از پیشرفت های خیره کننده ی ChatGPT تا ربات های انسان نما که
                مرزهای علم را جابه جا میکنند، هرآنچه در دنیای هوش مصننوعی
                میگذرد، در اینجا بخوانید.
              </p>
            </div>
            <div className="btn-container mb-2">
              <Link to='/ainews'>
                <button className="btn contnue">ادامه مطلب ...</button>
              </Link>
            </div>
            <div class="card-footer">
              <img src={profile} alt="Abbas" className="profile" />
              <h5 className="name">
                عباس روحانی تبار
              </h5>
            </div>
          </div>
        </div>
      </>
    );
}
 
export default PopularPosts;