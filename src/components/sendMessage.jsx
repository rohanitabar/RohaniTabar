import React from 'react';
import './home.css';

const SendMessage = () => {
    return ( 
        < >
            <div className='message-form send-Email'>
                <div class="mb-3 message-form">
                    <input type="text" class="form-control mb-3" id="exampleFormControlInput1" placeholder="نام شما" />
                    <input type="text" class="form-control" id="exampleFormControlInput1" placeholder="ایمیل شما" />
                </div>
                <div class="mb-3 message-form">
                <textarea class="form-control" id="exampleFormControlTextarea1" rows="3" placeholder='پیام شما' ></textarea>
                </div>
                <button type='submit' className='mb-2 send-btn'>ارسال</button>
            </div> 
        </>
    );
}
 
export default SendMessage;