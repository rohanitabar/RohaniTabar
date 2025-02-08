import React from 'react';
import Abbas from "./Abbas.png";
const Heder = () => {
    return (
      <>
        <div className="row about-me">
          <div className="col-md-6 ">
            <img src={Abbas} alt="Abbas" className="my-img" />
          </div>
          <div className="col-md-6 my-name">
            <b>من عباس روحانی تبار هستم</b>
            <p className="caption">برنامه نویس فرانت اند وب</p>
            <button className="btn info-btn ">همکاری با من</button>
          </div>
        </div>
      </>
    );
}
 
export default Heder;