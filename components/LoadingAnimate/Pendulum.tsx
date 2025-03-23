import React from 'react';
import styled from 'styled-components';

const PendulumLoader = () => {
  return (
    <StyledWrapper>
      <div className="loader">
        <span className="ball ball1" />
        <span className="ball" />
        <span className="ball" />
        <span className="ball" />
        <span className="ball" />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .loader {
    text-align: center;
    position: relative;
    display: flex;
  }

  .loader .ball {
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.5);
  }

  .ball {
    display: block;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: radial-gradient(circle at 8px 5px, white 5%, black);
    position: relative;
    transform-origin: 50% -100px;
  }

  .ball:last-child {
    animation: balance-right 1.2s infinite linear;
  }

  .ball:first-child {
    animation: balance-left 1.2s infinite linear;
  }

  @keyframes balance-right {
    0% {
      transform: rotate(0deg);
      animation-timing-function: linear;
    }

    50% {
      transform: rotate(0deg);
      animation-timing-function: ease-out;
    }

    75% {
      transform: rotate(-30deg);
      animation-timing-function: ease-in;
    }
  }

  @keyframes balance-left {
    0% {
      transform: rotate(0deg);
      animation-timing-function: ease-out;
    }

    25% {
      transform: rotate(30deg);
      animation-timing-function: ease-in;
    }

    50% {
      transform: rotate(0deg);
      animation-timing-function: linear;
    }
  }
`;

export default PendulumLoader;
