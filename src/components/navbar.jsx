import { Component } from 'react';
import "bootstrap/dist/css/bootstrap.rtl.min.css";
import {Link} from 'react-router-dom';
import "./home.css";

class Navbar extends Component {
    state = {  } 
    render() { 
        return (
        <>
            <nav class="navbar navbar-expand-lg bg-body-tertiary">
                <div class="container-fluid">
                        <Link class="navbar-brand" to="#"><img src="./Abbas.png" alt="Abbas" /></Link>
                        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                        </button>
                        <div class="collapse navbar-collapse" id="navbarSupportedContent">
                        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                            <li class="nav-item">
                            <Link class="nav-link " aria-current="page" to="#">ورود/ثبت نام</Link>
                            </li>
                            <li class="nav-item">
                            <Link class="nav-link" to="#">رزومه من</Link>
                            </li>
                            <li class="nav-item">
                            <Link class="nav-link" to="#">وبلاگ</Link>
                            </li>
                            <li class="nav-item dropdown">
                            <Link class="nav-link" to="#" role="button" aria-expanded="false">
                                نمونه کار ها
                            </Link>
                            </li>
                            <li class="nav-item">
                            <Link class="nav-link">خانه</Link>
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