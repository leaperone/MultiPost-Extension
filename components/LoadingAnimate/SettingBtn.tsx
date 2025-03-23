import React from 'react';
import styled from 'styled-components';

const SettingBtnLoader = () => {
  return (
    <StyledWrapper>
      <div className="loader" />
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .loader {
    width: 100px;
    height: 46px;
    position: relative;
    border-bottom: 5px solid #fff;
    border-top: 5px solid #fff;
    box-sizing: border-box;
  }

  .loader:before,
  .loader:after {
    content: '';
    position: absolute;
    left: 0;
    top: -20px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: orange;
    border: 5px solid #fff;
    box-sizing: border-box;
    animation: slide_391 1s infinite ease-in-out alternate;
  }

  .loader:after {
    top: 20px;
    animation-direction: alternate-reverse;
  }

  @keyframes slide_391 {
    0%,
    20% {
      transform: translateX(70px);
    }

    80%,
    100% {
      transform: translateX(-1px);
    }
  }
`;

export default SettingBtnLoader;
