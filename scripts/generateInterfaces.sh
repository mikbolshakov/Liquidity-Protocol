#! /bin/bash
set -e
PROJECT_ROOT="$(git rev-parse --show-toplevel)"

yank () {
  curl -s "http://api.etherscan.io/api?module=contract&action=getabi&address=$1&format=raw&apikey=TD2IC3FADTTWMK9CBJ2AKBYVZJSQ9BB6Q9" -H "User-Agent: Chrome" > /tmp/$2
  echo -n '.....'
}

gen () {
  printf "%25s" $2
  for i in {1..20}
  do
    sleep 0.1
    echo -n "."
  done
  yank $1 $2_abi.json
  cat /tmp/$2_abi.json | npx abi-to-sol $2 > $PROJECT_ROOT/contracts/thirdparty/interfaces/$2.sol
  printf "\x1b[48;2;0;100;0mDone.\e[0m\n"
}

gen "0xd51a44d3fae010294c616388b506acda1bfaae46" "ITricryptoPool" 
gen "0xdefd8fdd20e0f34115c7018ccfb655796f6b2168" "ILiquidityGaugeV3" 
gen "0x9D5C5E364D81DaB193b72db9E9BE9D8ee669B652" "IBaseRewardPool"
gen "0xF403C135812408BFbE8713b5A23a04b3D48AAE31" "IConvexBooster"
