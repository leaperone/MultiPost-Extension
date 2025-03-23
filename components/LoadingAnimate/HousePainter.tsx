import React from 'react';
import styled from 'styled-components';

const HousePainterLoader = () => {
  return (
    <StyledWrapper>
      <div className="wrapper">
        <div className="container">
          <div className="roller">
            <div className="handle" />
          </div>
          <div className="paint" />
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .container {
    height: 350px;
    width: 350px;
    -webkit-transform: rotate(-45deg);
    -ms-transform: rotate(-45deg);
    transform: rotate(-45deg);
  }
  .roller {
    height: 45px;
    width: 150px;
    border: 5px solid #040e15;
    border-radius: 7px;
    background-image: -webkit-gradient(
      linear,
      left top,
      left bottom,
      color-stop(0, #ffc111),
      color-stop(80%, #ffca3e),
      color-stop(80%, #fc8f2e)
    );
    background-image: -o-linear-gradient(top, #ffca3e 0, #ffca3e 80%, #fc8f2e 80%);
    background-image: linear-gradient(to bottom, #ffca3e 0, #ffca3e 80%, #fc8f2e 80%);
    position: absolute;
    margin: auto;
    left: 0;
    right: 0;
    top: 0;
    -webkit-animation: roller 2s infinite;
    animation: roller 2s infinite;
  }
  @-webkit-keyframes roller {
    40% {
      top: 165px;
    }
  }
  @keyframes roller {
    40% {
      top: 165px;
    }
  }
  .roller:before {
    position: absolute;
    content: '';
    background-color: rgba(255, 255, 255, 0.7);
    height: 7px;
    width: 75px;
    top: 8px;
    left: 8px;
    border-radius: 10px;
  }
  .roller:after {
    position: absolute;
    content: '';
    height: 40px;
    width: 85px;
    border: 7px solid #040e15;
    border-left: none;
    right: -20px;
    top: 20px;
    z-index: -1;
    border-radius: 7px;
  }
  .handle {
    height: 30px;
    width: 7px;
    background-color: #040e15;
    position: absolute;
    top: 68px;
    right: 65px;
  }
  .handle:after {
    position: absolute;
    content: '';
    height: 75px;
    width: 25px;
    background-color: #040e15;
    bottom: -75px;
    right: -8px;
    border-radius: 5px;
  }
  .paint {
    background-color: #ffca3e;
    height: 0;
    width: 130px;
    position: absolute;
    margin: auto;
    left: 0;
    right: 0;
    z-index: -1;
    -webkit-animation: paint 2s infinite;
    animation: paint 2s infinite;
  }
  @-webkit-keyframes paint {
    40% {
      height: 165px;
    }
  }
  @keyframes paint {
    40% {
      height: 165px;
    }
  }
  .roller {
    height: 45px;
    width: 150px;
    border: 5px solid #040e15;
    border-radius: 7px;
    background-image: -webkit-gradient(
      linear,
      left top,
      left bottom,
      color-stop(0, #fc8f2e),
      /* Cor laranja clara */ color-stop(80%, #fc8f2e),
      /* Cor laranja */ color-stop(80%, #e86f1a) /* Cor laranja escura */
    );
    background-image: -o-linear-gradient(top, #fc8f2e 0, #fc8f2e 80%, #e86f1a 80%);
    background-image: linear-gradient(to bottom, #fc8f2e 0, #fc8f2e 80%, #e86f1a 80%);
    position: absolute;
    margin: auto;
    left: 0;
    right: 0;
    top: 0;
    -webkit-animation: roller 2s infinite;
    animation: roller 2s infinite;
  }

  .paint {
    background-color: #fc8f2e;
    height: 0;
    width: 130px;
    position: absolute;
    margin: auto;
    left: 0;
    right: 0;
    z-index: -1;
    -webkit-animation: paint 2s infinite;
    animation: paint 2s infinite;
  }
`;

export default HousePainterLoader;
