import React, { Component } from 'react';
import './home.css';
import Header from './header';
import Skil from './skils';
import About from './aboutMe';
import Footer from './footer';
import MyResumey from "./my Resume";
import PopularPosts from './popular-Posts';
import { SendMessage } from './sendMessage';

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
            <SendMessage/>
            <br />
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