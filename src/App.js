import 'bootstrap/dist/css/bootstrap.rtl.min.css';
import {BrowserRouter, Routes , Route} from 'react-router-dom';
import './App.css';
import Navbar from './components/navbar';
import Home from './components/home';

function App() {
  return (
    <BrowserRouter>
      <Navbar/>
      <Routes>
        <Route path='/' Component={Home}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
