import React from 'react';
import { Link } from 'react-router-dom';
const Signup = () => {
    return ( 
        <>
            <h1 className='title mb-5'>ثبت نام در سایت</h1>
            <div  style={{ direction:'rtl',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                <div class="mb-3" style={{display:'flex',justifyContent:'center'}}>
                    <input type="text" class="form-control" id="exampleFormControlInput1" placeholder="نام" style={{direction:'rtl',width:'350px'}}/>
                    <input type="text" class="form-control" id="exampleFormControlInput1" placeholder="نام خانوادگی" style={{direction:'rtl',width:'350px',marginRight:'20px'}}/>
                </div>
                <div class="mb-3" style={{display:'flex',justifyContent:'center'}}>
                    <input type="email" class="form-control" id="exampleFormControlInput1" placeholder="ایمیل" style={{direction:'rtl',width:'92%'}}/>
                </div>
                <div class="mb-3" style={{display:'flex',justifyContent:'center'}}>
                    <input type="password" class="form-control" id="exampleFormControlInput1" placeholder="رمز عبور" style={{direction:'rtl',width:'92%'}}/>
                </div>
                 <div class="mb-3" style={{display:'flex',justifyContent:'center'}}>
                    <input type="password" class="form-control" id="exampleFormControlInput1" placeholder="تکرار رمز عبور" style={{direction:'rtl',width:'92%'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'center'}}>
                    <Link>
                        <button className='login'>ثبت نام</button>
                    </Link>
                </div>
            </div>
        </> 
    );
}
 
export default Signup;