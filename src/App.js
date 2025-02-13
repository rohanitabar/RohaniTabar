import 'bootstrap/dist/css/bootstrap.rtl.min.css';
import {BrowserRouter, Routes , Route} from 'react-router-dom';
import './App.css';
import Navbar from './components/navbar';
import Home from './components/home';
import NotFound from './Notfound';
import About from './components/aboutMe';
import News from './components/news';
import myResumey from './components/my Resume';
import Login from './components/login';
import Signup from './components/signup';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path='/login' Component={Login}/>
        <Route path='/signup' Component={Signup}/>
        <Route path="/news" Component={News} />
        <Route path="/myprojects" Component={myResumey} />
        <Route path="/about" Component={About} />
        <Route path="/" Component={Home} />
        <Route path="*" Component={NotFound} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
