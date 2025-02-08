import React, { Component } from 'react';
import './home.css';
import Heder from './heder';
import Skil from './skils';
import About from './aboutMe';
import Footer from './footer';

class Home extends Component {
    render() { 
        return (
          <>
            <Heder/>
            <About/>
            <Skil/>
            <Footer/>
          </>
        );
    }
}
 
export default Home;