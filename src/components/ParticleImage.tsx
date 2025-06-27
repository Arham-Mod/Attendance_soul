import React, { useEffect, useRef } from 'react';

interface ParticleImageProps {
  width?: number;
  height?: number;
  particleCount?: number;
  backgroundColor?: string;
}

const ParticleImage: React.FC<ParticleImageProps> = ({
  width = 1000,
  height = 1000,
  particleCount = 8000,
  backgroundColor = '#000000'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Function to download the canvas as an image
  const downloadImage = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = 'particle-background.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Fill the background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Create particles in a circular pattern
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.4;
    
    // Colors for the particles
    const colors = [
      { r: 255, g: 255, b: 255, a: 0.7 },  // White
      { r: 255, g: 165, b: 0, a: 0.6 },    // Orange/Yellow
      { r: 255, g: 105, b: 180, a: 0.5 },  // Pink
      { r: 100, g: 149, b: 237, a: 0.6 }   // Light Blue
    ];
    
    for (let i = 0; i < particleCount; i++) {
      // Use parametric equations to create spiral patterns
      const t = Math.random() * Math.PI * 2;
      const spiral = Math.random() * 2 * Math.PI;
      const radius = maxRadius * Math.pow(Math.random(), 0.5); // Square root to distribute more evenly
      
      // Distort the position a bit for more organic look
      const x = centerX + radius * Math.cos(t + spiral) * (0.8 + 0.4 * Math.random());
      const y = centerY + radius * Math.sin(t - spiral) * (0.8 + 0.4 * Math.random());
      
      // Choose a random color from our palette
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Draw the particle
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a * Math.random()})`;
      
      // Vary the particle size
      const size = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Trigger download
    downloadImage();
  }, [width, height, particleCount, backgroundColor]);
  
  return (
    <div style={{ display: 'none' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default ParticleImage; 