import React from 'react';
import './home.css';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>تماس با من</h3>
          <Link to="mailto:a.rohanitabar.gmail.com" target='_blank'>
            ایمیل: a.rohanitabar@gmail.com
          </Link>
          <br />
          <Link to="tel:9032991639" target='_blank'>تلفن: ٠٩٠٣٢٩٩١٦٣٩ </Link>
        </div>

        <div className="footer-section">
          <h3>دسترسی سریع</h3>
          <ul>
            <li>
              <Link to="/about" target='_blank'>درباره من</Link>
            </li>
            <li>
              <Link to="/myprojects" target='_blank'>رزومه من</Link>
            </li>
            <li>
              <Link to="/news" target='_blank'>اخبار و مقالات</Link>
            </li>
          </ul>
        </div>

        <div className="footer-section" style={{display:'flex', justifyContent:'center', flexDirection:'column'}}>
          <h3>شبکه‌های اجتماعی</h3>
          <div className="social-icons">
            <Link to="https://github.com/rohanitabar/" target="_blank">
              <i className="fab fa-github"></i>
            </Link>
            <Link to="https://wa.me/989032991639" target="_blank">
              <i className="fab fa-whatsapp"></i>
            </Link>
            <Link to="https://t.me/AbbasRt_1385" target="_blank">
              <i className="fab fa-telegram"></i>
            </Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>{new Date().getFullYear()} - تمامی حقوق برای <b>عباس روحانی تبار</b> محفوظ است &copy;</p>
      </div>
    </footer>
  );
};

export default Footer;