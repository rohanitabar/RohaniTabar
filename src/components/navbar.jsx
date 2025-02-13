import { Component } from 'react';
import "bootstrap/dist/css/bootstrap.rtl.min.css";
import {Link} from 'react-router-dom';
import "./home.css";
import logo from './logo site.jpg'

class Navbar extends Component {
    state = {  } 
    render() { 
        return (
          <>
            <nav class="navbar navbar-expand-lg bg-body-tertiary">
              <Link class="navbar-brand" to="/">
                <img
                  src={logo}
                  alt="Abbas"
                  className="logo"
                  style={{ marginRight: "20px" }}
                />
              </Link>
              <button
                class="navbar-toggler"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarSupportedContent"
                aria-controls="navbarSupportedContent"
                aria-expanded="false"
                aria-label="Toggle navigation"
              >
                <span class="navbar-toggler-icon"></span>
              </button>
              <div class="container-fluid">
                <div
                  class="collapse navbar-collapse"
                  id="navbarSupportedContent"
                >
                  <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    <li class="nav-item">
                      <Link to="/" class="nav-link">
                        خانه
                      </Link>
                    </li>
                    <li class="nav-item">
                      <Link class="nav-link" to="/news">
                        اخبار و مقالات
                      </Link>
                    </li>
                    <li class="nav-item">
                      <Link class="nav-link" to="/myprojects">
                        رزومه من
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </nav>
          </>
        );
    }
}
 
export default Navbar;