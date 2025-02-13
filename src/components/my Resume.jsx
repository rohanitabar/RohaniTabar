import React from 'react';
import { Link } from 'react-router-dom';

const MyResumey = () => {
    return (
      <>
        <h1 className="title">پروژه های من</h1>
        <br />
        <br />
        <div
          style={{ display: "flex", justifyContent: "center" }}
          className="col-12"
        >
          <div className="resumey">
            <div className="circle mt-5 mb-5">
              <Link
                to="https://github.com/rohanitabar/Rostam-chat-bot"
                target="_blank"
              >
                <div className="info">
                  <h3>چت بات رستم</h3>
                </div>
              </Link>
            </div>
            <div className="circle mb-5">
              <Link
                to="https://github.com/rohanitabar/music-player"
                target="_blank"
              >
                <div className="info-1">
                  <h3>موزیک پلیر </h3>
                </div>
              </Link>
            </div>
            <div className="circle mb-5">
              <Link to="https://github.com/rohanitabar/Profile" target="_blank">
                <div className="info">
                  <h3>صفحه پروفایل</h3>
                </div>
              </Link>
            </div>
            <div className="circle mb-5">
              <Link
                to="https://github.com/rohanitabar/chat-page"
                target="_blank"
              >
                <div className="info-1">
                  <h3>صفحه چت</h3>
                </div>
              </Link>
            </div>
            <div className="circle mb-5">
              <Link
                to="https://github.com/rohanitabar/cooment-box"
                target="_blank"
              >
                <div className="info">
                  <h3>قسمت نظرات کاربران</h3>
                </div>
              </Link>
            </div>
            <div className="circle mb-5">
              <Link
                to="https://github.com/rohanitabar/Movie-Plus"
                target="_blank"
              >
                <div className="info-1">
                  <h3>مووی پلاس</h3>
                </div>
              </Link>
            </div>
            <div className="circle mb-3">
              <Link
                to="https://github.com/rohanitabar/sub-menu"
                target="_blank"
              >
                <div className="info">
                  <h3>منوی مدرن</h3>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
}
 
export default MyResumey;