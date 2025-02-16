import 'bootstrap/dist/css/bootstrap.rtl.min.css';
import {BrowserRouter, Routes , Route} from 'react-router-dom';
import './App.css';
import Navbar from './components/navbar';
import Home from './components/home';
import NotFound from './Notfound';
import About from './components/aboutMe';
import News from './components/news';
import myResumey from './components/my Resume';
import DeepSeek from './components/deepseek';
import AINews from './components/ainews';
import Qwen from './components/qwen';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/deepseekai" Component={DeepSeek} />
        <Route path="/ainews" Component={AINews} />
        <Route path="/qwenai" Component={Qwen} />
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
