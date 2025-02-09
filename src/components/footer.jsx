import React from 'react';
import './home.css';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>تماس با من</h3>
          <Link to='https://a.rohanitabar.gmail.com'>ایمیل: a.rohanitabar@gmail.com</Link><br/>
          <Link to="tel:9032991639">تلفن: ٠٩٠٣٢٩٩١٦٣٩ </Link>
        </div>

        <div className="footer-section">
          <h3>لینک‌های سریع</h3>
          <ul>
            <li>
              <Link to="/about">درباره من</Link>
            </li>
            <li>
              <Link to="/resoumeh">رزومه من</Link>
            </li>
            <li>
              <Link to="/blog">بلاگ</Link>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>شبکه‌های اجتماعی</h3>
          <div className="social-icons">
            <Link to="#">
              <i className="fab fa-github"></i>
            </Link>
            <Link to="#">
              <i className="fab fa-linkedin"></i>
            </Link>
            <Link to="#">
              <i className="fab fa-twitter"></i>
            </Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>{new Date().getFullYear()} - تمامی حقوق محفوظ است &copy;</p>
      </div>
    </footer>
  );
};

export default Footer;