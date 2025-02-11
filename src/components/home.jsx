import React, { Component } from 'react';
import './home.css';
import Header from './header';
import Skil from './skils';
import About from './aboutMe';
import Footer from './footer';
import MyResumey from "./my Resume";
import SendMessage from './sendMessage';
import PopularPosts from './popular-Posts';

class Home extends Component {
    render() { 
        return (
          <>
            <Header />
            <About />
            <Skil />
            <br />
            <h1 className="title mb-4">ارتباط با من</h1>
            <br />
            <SendMessage />
            <br />
            <h1 className="title">رزومه من</h1>
            <br />
            <MyResumey />
            <br />
            <PopularPosts />
            <br />
            <br />
            <Footer />
          </>
        );
    }
}
 
export default Home;