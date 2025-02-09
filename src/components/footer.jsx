import React from 'react';
import './home.css';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>تماس با من</h3>
          <p>ایمیل: a.rohanitabar@gmail.com</p>
          <p>تلفن: ٠٩٠٣٢٩٩١٦٣٩ </p>
        </div>

        <div className="footer-section">
          <h3>لینک‌های سریع</h3>
          <ul>
            <li>
              <Link to="/about">درباره من</Link>
            </li>
            <li>
              <Link to="/portfolio">نمونه کارها</Link>
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