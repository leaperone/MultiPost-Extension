import React from 'react';
import styled from 'styled-components';

const CubeLoader = () => {
  return (
    <StyledWrapper>
      <div className="loader">
        <div className="cube">
          <div className="face" />
          <div className="face" />
          <div className="face" />
          <div className="face" />
          <div className="face" />
          <div className="face" />
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .loader {
    perspective: 600px;
    width: 100px;
    height: 100px;
  }

  .cube {
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    animation: rotate 4s linear infinite;
  }

  .face {
    position: absolute;
    width: 100%;
    height: 100%;
    background: linear-gradient(45deg, #3498db, #e74c3c);
    opacity: 0.8;
    border: 0.5px solid #fff;
  }

  .face:nth-child(1) {
    transform: rotateX(90deg) translateZ(50px);
  }

  .face:nth-child(2) {
    transform: rotateX(-90deg) translateZ(50px);
  }

  .face:nth-child(3) {
    transform: translateZ(50px);
  }

  .face:nth-child(4) {
    transform: rotateY(90deg) translateZ(50px);
  }

  .face:nth-child(5) {
    transform: rotateY(-90deg) translateZ(50px);
  }

  .face:nth-child(6) {
    transform: rotateY(180deg) translateZ(50px);
  }

  @keyframes rotate {
    0% {
      transform: rotateX(0deg) rotateY(0deg);
    }

    100% {
      transform: rotateX(360deg) rotateY(360deg);
    }
  }
`;

export default CubeLoader;
