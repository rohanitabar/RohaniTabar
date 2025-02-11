import 'bootstrap/dist/css/bootstrap.rtl.min.css';
import {BrowserRouter, Routes , Route} from 'react-router-dom';
import './App.css';
import Navbar from './components/navbar';
import Home from './components/home';
import NotFound from './Notfound';
import About from './components/aboutMe';
import Blog from './components/blog';
import myResumey from './components/my Resume';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/blog" Component={Blog} />
        <Route path="/resumey" Component={myResumey} />
        <Route path="/about" Component={About} />
        <Route path="/" Component={Home} />
        <Route path="*" Component={NotFound} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
