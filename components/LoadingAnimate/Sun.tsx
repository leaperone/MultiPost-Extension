import React from 'react';
import styled from 'styled-components';

const SunLoader = () => {
  return (
    <StyledWrapper>
      <div className="loader" />
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .loader {
    width: 100px;
    height: 100px;
    background-color: orange;
    border-radius: 50%;
    box-shadow:
      -15px -15px 15px #ff6600,
      15px -15px 15px #ff9100,
      15px 15px 15px #ff5500,
      -15px 15px 15px #ffa600,
      -15px 0 15px #ff6600,
      15px 0 15px #ffcc00;
    animation: rotate 1s infinite;
    transform: rotate(0) scale(0.8);
  }

  @keyframes rotate {
    0% {
      transform: rotate(360deg) scale(0.8);
    }

    50% {
      transform: rotate(0) scale(1.2);
    }
  }
`;

export default SunLoader;
