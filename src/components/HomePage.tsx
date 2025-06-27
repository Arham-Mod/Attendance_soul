import React from 'react';
import '../styles/HomePage.css';
import backgroundGif from '../assets/background.gif';

interface HomePageProps {
  onEnter: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onEnter }) => {
  return (
    <div className="home-page" style={{ backgroundColor: '#020001' }}>
      <div className="top-bar">
        <div className="logo">ARHAM</div>
        <div className="slogan">Track your attendance efficiently,<br />even in a busy schedule</div>
        <button className="menu-button" onClick={onEnter}>MENU</button>
      </div>
      
      <div className="main-content">
        <div className="main-title">
          <h1>ATTENDANCE</h1>
        </div>
        
        <div className="background-gif-container">
          <img 
            src={backgroundGif} 
            alt="Background animation" 
            className="background-gif-img"
            style={{ backgroundColor: 'transparent' }}
          />
        </div>
      </div>
      
      <div className="footer">
        <div className="year">2023</div>
      </div>
    </div>
  );
};

export default HomePage; 