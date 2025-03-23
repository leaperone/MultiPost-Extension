import React from 'react';
import styled from 'styled-components';

const CoffeeMachineLoader = () => {
  return (
    <StyledWrapper>
      <div className="loader">
        <div className="container">
          <div className="coffee-header">
            <div className="coffee-header__buttons" />
            <div className="coffee-header__display" />
            <div className="coffee-header__details" />
          </div>
          <div className="coffee-medium">
            <div className="coffe-medium__exit" />
            <div className="coffee-medium__arm" />
            <div className="coffee-medium__liquid" />
            <div className="smoke one" />
            <div className="smoke two" />
            <div className="smoke three" />
            <div className="smoke four" />
            <div className="coffee-medium__cup" />
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .loader {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    justify-content: center;
    align-items: center;
    scale: 0.8;
  }
  .loader .container {
    width: 300px;
    height: fit-content;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .loader .container .coffee-header {
    padding: 10px;
    width: 100%;
    height: 80px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #ddcfcc;
    border-radius: 10px;
  }
  .loader .container .coffee-header__buttons {
    width: 25px;
    height: 25px;
    background-color: #282323;
    border-radius: 50%;
    box-shadow: 40px 0 0 0 #282323;
  }
  .loader .container .coffee-header__buttons::before {
    content: '';
    width: 8px;
    height: 8px;
    display: block;
    transform: translate(100%, 25px);
    background-color: #615e5e;
    box-shadow: 40px 0 0 0 #615e5e;
  }
  .loader .container .coffee-header__display {
    width: 50px;
    height: 50px;
    display: block;
    border-radius: 50%;
    background-color: #9acfc5;
    border: 5px solid #43beae;
    box-sizing: border-box;
  }
  .loader .container .coffee-header__details {
    width: 8px;
    margin-left: 16px;
    height: 20px;
    align-self: flex-start;
    background-color: #9b9091;
    box-shadow:
      -12px 0 0 #9b9091,
      -24px 0 0 #9b9091;
  }
  .loader .container .coffee-medium {
    width: 90%;
    height: 160px;
    position: relative;
    background-color: #bcb0af;
  }
  .loader .container .coffee-medium:before {
    content: '';
    width: 90%;
    height: 100px;
    background-color: #776f6e;
    position: absolute;
    bottom: 0;
    left: 5%;
    border-radius: 20px 20px 0 0;
  }
  .loader .container .coffe-medium__exit {
    width: 60px;
    height: 20px;
    position: absolute;
    top: 0;
    left: calc(50% - 30px);
    background-color: #231f20;
  }
  .loader .container .coffe-medium__exit::before {
    content: '';
    width: 50px;
    height: 20px;
    border-radius: 0 0 50% 50%;
    position: absolute;
    bottom: -20px;
    left: calc(50% - 25px);
    background-color: #231f20;
  }
  .loader .container .coffe-medium__exit::after {
    content: '';
    width: 10px;
    height: 10px;
    position: absolute;
    bottom: -30px;
    left: calc(50% - 5px);
    background-color: #231f20;
  }
  .loader .container .coffee-medium__arm {
    width: 70px;
    height: 20px;
    position: absolute;
    top: 15px;
    right: 25px;
    background-color: #231f20;
  }
  .loader .container .coffee-medium__arm::before {
    content: '';
    width: 15px;
    height: 5px;
    position: absolute;
    top: 7px;
    left: -15px;
    background-color: #9e9495;
  }
  .loader .container .coffee-medium__cup {
    width: 80px;
    height: 47px;
    position: absolute;
    bottom: 0;
    left: calc(50% - 40px);
    background-color: #fff;
    border-radius: 0 0 70px 70px/0 0 110px 110px;
  }
  .loader .container .coffee-medium__cup::after {
    content: '';
    width: 20px;
    height: 20px;
    position: absolute;
    top: 6px;
    right: -13px;
    border: 5px solid #fff;
    border-radius: 50%;
  }
  .loader .container .coffee-medium__liquid {
    width: 6px;
    height: 63px;
    position: absolute;
    top: 50px;
    left: calc(50% - 3px);
    background-color: transparent;
    overflow: hidden;
  }
  .loader .container .coffee-medium__liquid::before {
    transform: translateY(-100%);
    content: '';
    width: 100%;
    height: 100%;
    display: block;
    background-color: #74372b;
    animation: liquid 5000ms linear 3500ms infinite normal both;
  }
  .loader .container .smoke {
    opacity: 0;
    width: 8px;
    height: 20px;
    position: absolute;
    border-radius: 5px;
    background-color: #b3aeae;
  }
  .loader .container .smoke.one {
    bottom: 30px;
    left: 102px;
    animation: smoke 3s 5s linear infinite;
  }
  .loader .container .smoke.two {
    bottom: 40px;
    left: 118px;
    animation: smoke 3s 4s linear infinite;
  }
  .loader .container .smoke.three {
    bottom: 40px;
    right: 118px;
    animation: smoke 3s 7s linear infinite;
  }
  .loader .container .smoke.four {
    bottom: 30px;
    right: 102px;
    animation: smoke 3s 6s linear infinite;
  }
  .loader .container::after {
    content: '';
    width: 95%;
    height: 15px;
    background-color: #41bdad;
    box-shadow: 0 15px 0 5px #000;
    border-radius: 10px;
  }

  @-webkit-keyframes smoke {
    0% {
      transform: translateY(0px);
      opacity: 0;
    }
    40% {
      opacity: 0.5;
    }
    50% {
      transform: translateY(-10px);
      opacity: 0.3;
    }
    80% {
      opacity: 0.5;
    }
    100% {
      transform: translateY(-30px);
      opacity: 0;
    }
  }

  @keyframes smoke {
    0% {
      transform: translateY(0px);
      opacity: 0;
    }
    40% {
      opacity: 0.5;
    }
    50% {
      transform: translateY(-10px);
      opacity: 0.3;
    }
    80% {
      opacity: 0.5;
    }
    100% {
      transform: translateY(-30px);
      opacity: 0;
    }
  }
  @-webkit-keyframes liquid {
    10% {
      transform: translateY(0);
    }
    90% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(100%);
    }
  }
  @keyframes liquid {
    10% {
      transform: translateY(0);
    }
    90% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(100%);
    }
  }
`;

export default CoffeeMachineLoader;
