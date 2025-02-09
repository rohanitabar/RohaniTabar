import React, { Component } from 'react';
import './home.css';
import Header from './header';
import Skil from './skils';
import About from './aboutMe';
import Footer from './footer';

class Home extends Component {
    render() { 
        return (
          <>
            <Header />
            <About />
            <Skil />
            <br /><br/>
            <Footer />
          </>
        );
    }
}
 
export default Home;