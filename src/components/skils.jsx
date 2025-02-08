import React, { Component } from 'react';
import './home.css'
class Skil extends Component {
    state = {  } 
    render() { 
        return (
          <>
            <h1 className="title">مهارت ها</h1>
            <div className="skil-container">
              <div class="mb-3 ">
                <div class="row">
                  <div class="col-md-8 card-skil">
                    <div class="card-body">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/HTML5_logo_and_wordmark.svg/512px-HTML5_logo_and_wordmark.svg.png"
                        class="img-fluid rounded-start skil-img"
                        alt="..."
                      />
                      <h5 class="card-title">HTML</h5>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mb-3 ">
                <div class="row">
                  <div class="col-md-8 card-skil">
                    <div class="card-body">
                      <img
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQeB0Kf8bAgxekAzMETw0PwdbibAGCa2FrfDQ&s"
                        class="img-fluid rounded-start skil-img"
                        alt="..."
                      />
                      <h5 class="card-title">CSS</h5>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mb-3 ">
                <div class="row">
                  <div class="col-md-8 card-skil">
                    <div class="card-body">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png"
                        class="img-fluid rounded-start skil-img"
                        alt="..."
                      />
                      <h5 class="card-title">JS</h5>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mb-3 ">
                <div class="row">
                  <div class="col-md-8 card-skil">
                    <div class="card-body">
                      <img
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkt5wzZ1LZXdBJSY1lele-BsBxzSxDph8TQA&s"
                        class="img-fluid rounded-start skil-img"
                        alt="..."
                      />
                      <h5 class="card-title">BootStrap</h5>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mb-3 ">
                <div class="row">
                  <div class="col-md-8 card-skil">
                    <div class="card-body">
                      <img
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlGmKtrnxElpqw3AExKXPWWBulcwjlvDJa1Q&s"
                        class="img-fluid rounded-start skil-img"
                        alt="..."
                      />
                      <h5 class="card-title">React</h5>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mb-3 ">
                <div class="row">
                  <div class="col-md-8 card-skil">
                    <div class="card-body">
                      <img
                        src="https://img.icons8.com/color/200/git.png"
                        class="img-fluid rounded-start skil-img"
                        alt="..."
                      />
                      <h5 class="card-title">Git</h5>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        );
    }
}
 
export default Skil;