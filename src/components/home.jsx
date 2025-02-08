import React, { Component } from 'react';
import './home.css';
import Heder from './heder';
import Skil from './skils';
import About from './aboutMe';

class Home extends Component {
    render() { 
        return (
          <>
            <Heder/>
            <About/>
            <Skil/>
          </>
        );
    }
}
 
export default Home;