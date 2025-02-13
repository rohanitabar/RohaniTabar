import React from 'react';
import Abbas from "./Abbas.png";
import { Link } from 'react-router-dom';
const Header = () => {
    return (
      <>
        <div className="row about-me">
          <div className="col-md-6 ">
            <img src={Abbas} alt="Abbas" className="my-img" />
          </div>
          <div className="col-md-6 my-name">
            <b>من عباس روحانی تبار هستم</b>
            <p className="caption">برنامه نویس فرانت اند</p>
            <Link to="https://wa.me/989032991639" target='_blank'>
              <button className="btn info-btn ">همکاری با من</button>
            </Link>
          </div>
        </div>
      </>
    );
}
 
export default Header;