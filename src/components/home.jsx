import React, { Component } from 'react';
import './home.css';
import Header from './header';
import Skil from './skils';
import About from './aboutMe';
import Footer from './footer';
import SendMessage from './sendMessage';

class Home extends Component {
    render() { 
        return (
          <>
            <Header />
            <About />
            <Skil />
            <br />
            <h1 className='title mb-4'>ارتباط با من</h1>
            <SendMessage/>
            <br /><br/>
            <Footer />
          </>
        );
    }
}
 
export default Home;