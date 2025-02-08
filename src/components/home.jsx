import React, { Component } from 'react';
import './home.css';
import Heder from './heder';
import Skil from './skils';

class Home extends Component {
    render() { 
        return (
          <>
            <Heder/>
            <Skil/>
          </>
        );
    }
}
 
export default Home;