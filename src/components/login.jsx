import React from 'react';
import { Link } from 'react-router-dom';
import './home.css';
const Login = () => {
    return ( 
        <>
            <h1 className='title mb-5'>ورود به سایت</h1>
            <div  style={{ direction:'rtl',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                <div class="mb-3" style={{display:'flex',justifyContent:'center'}}>
                    <input type="email" class="form-control" id="exampleFormControlInput1" placeholder="ایمیل" style={{direction:'rtl',width:'92%'}}/>
                </div>
                <div class="mb-3" style={{display:'flex',justifyContent:'center'}}>
                    <input type="password" class="form-control" id="exampleFormControlInput1" placeholder="رمز عبور" style={{direction:'rtl',width:'92%'}}/>
                </div>
                     <div style={{display:'flex',justifyContent:'center'}}>
                    <Link>
                        <button className='login'>ورود</button>
                    </Link>
                </div>
                <h6 className='text-center mt-3'>حساب ندارید؟<Link to='/signup'>ثبت نام کنید</Link></h6>
            </div>
        </> 
    );
}
 
export default Login;