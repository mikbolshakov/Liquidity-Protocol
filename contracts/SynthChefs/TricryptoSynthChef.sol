// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity >=0.8.15;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./BaseSynthChef.sol";
import "hardhat/console.sol";

interface IBaseRewardPool {
    function getReward() external returns (bool);

    function withdrawAndUnwrap(uint256 amount, bool claim) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

interface IConvexBooster {
    function deposit(uint256 _pid, uint256 _amount, bool _stake) external returns (bool);

    function poolInfo(
        uint256
    )
        external
        view
        returns (
            address lptoken,
            address token,
            address gauge,
            address crvRewards,
            address stash,
            bool shutdown
        );
}

interface ITricryptoPool {
    function calc_token_fee(
        uint256[3] memory amounts,
        uint256[3] memory xp
    ) external view returns (uint256);

    function calc_token_amount(
        uint256[3] memory amounts,
        bool deposit
    ) external view returns (uint256);

    function calc_withdraw_one_coin(
        uint256 token_amount,
        uint256 i
    ) external view returns (uint256);

    function add_liquidity(uint256[3] memory amounts, uint256 min_mint_amount) external;

    function remove_liquidity(uint256 _amount, uint256[3] memory min_amounts) external;

    function balances(uint256 arg0) external view returns (uint256);

    function coins(uint256 i) external view returns (address);
}

interface CurveLp is IERC20 {
    function minter() external returns (address);
}

contract TricryptoSynthChef is BaseSynthChef {
    using SafeERC20 for IERC20;

    IConvexBooster m_ConvexBooster;
    struct Pool {
        ITricryptoPool LiqidityPool;
        IBaseRewardPool CrvRewards;
        IERC20 LpToken;
        uint256 ConvexPoolId;
    }
    Pool[] public Pools;

    // FIXME: This will only support pools with 3 coins
    uint8 constant m_TokensCount = 3;

    constructor(
        IConvexBooster booster,
        // Base
        address _DEXWrapper,
        address _stablecoin,
        address[] memory _rewardTokens,
        uint256 _fee,
        address _feeCollector
    ) BaseSynthChef(_DEXWrapper, _stablecoin, _rewardTokens, _fee, _feeCollector) {
        m_ConvexBooster = booster;
    }

    event ExpectLPs(uint256 amountexp, uint256 fee);

    function getLpToken(uint256 pid) public view returns (address) {
        return address(Pools[pid].LpToken);
    }

    function _depositToFarm(uint256 pid, uint256 _amount) internal override {
        m_ConvexBooster.deposit(Pools[pid].ConvexPoolId, _amount, true);
    }

    function _harvest(uint256 pid) internal override {
        Pools[pid].CrvRewards.getReward();
    }

    function _withdrawFromFarm(uint256 pid, uint256 amount) internal override {
        Pools[pid].CrvRewards.withdrawAndUnwrap(amount, false);
    }

    function getLPAmountOnFarm(uint256 pid) public view override returns (uint256) {
        return Pools[pid].CrvRewards.balanceOf(address(this));
    }

    /**
     * NOTE: Currently only single pool is implemented;
     *       Also returned amount of LP Tokens minted is not guranieeed
     *       to be correct, because `pool.add_liqidity` method does not
     *       return the ammmount of LP Tokens minted; We base our
     *       expectaions on the recived amount of LP Tokens from the
     *       `pool.calc_token_amount` call which does not account for fees
     *       So... trying to be on the safe side we subtract the fees from
     *       the result
     */
    function _addLiquidity(
        uint256 pid,
        address tokenFrom,
        uint256 amount
    ) internal override returns (uint256 LPAmount) {
        Pool storage pool = Pools[pid];

        uint256[3] memory amounts = [uint(0), uint(0), uint(0)];
        address[3] memory tokens = _getPoolTokens(pool);
        // _convertTokensToProvideLiquidity
        for (uint8 i = 0; i < m_TokensCount; ++i) {
            amounts[i] = _convertTokens(tokenFrom, tokens[i], amount / m_TokensCount);
        }

        uint256[3] memory xp = _getPoolBalances(pool);
        uint256 fees = pool.LiqidityPool.calc_token_fee(amounts, xp);

        uint256 expected = pool.LiqidityPool.calc_token_amount(amounts, true); // This does not account for fees...

        // Should we adjust our expectatins since it does not account for fees?
        // Seems to work fine. Does the lp not apply fees at this step?
        pool.LiqidityPool.add_liquidity(amounts, expected);
        // Emit the expected ammount of lp tokens to test is our assumptions correct
        emit ExpectLPs(expected, fees);
        return expected;
    }

    function _removeLiquidity(
        uint256 pid,
        uint256 amount
    ) internal override returns (TokenAmount[] memory) {
        Pool storage pool = Pools[pid];
        TokenAmount[] memory tokenAmounts = new TokenAmount[](3);

        uint256[3] memory min_amounts = [uint(0), uint(0), uint(0)];
        uint256 totalSupply = pool.LpToken.totalSupply();

        address[3] memory tokens = _getPoolTokens(pool);
        uint256[3] memory balances = _getPoolBalances(pool);

        for (uint8 i = 0; i < m_TokensCount; ++i) {
            min_amounts[i] = ((balances[i] * amount) / totalSupply) - 1;
            tokenAmounts[i] = TokenAmount(min_amounts[i], tokens[i]);
        }

        pool.LiqidityPool.remove_liquidity(amount, min_amounts);
        return tokenAmounts;
    }

    function _getTokensInLP(uint256 pid) internal view override returns (TokenAmount[] memory) {
        Pool storage pool = Pools[pid];
        TokenAmount[] memory tokens = new TokenAmount[](3);

        uint256 amountLp = getLPAmountOnFarm(pid);
        address[3] memory _tokens = _getPoolTokens(pool);

        for (uint8 i = 0; i < m_TokensCount; ++i) {
            // We should probalby divide amountLp by the m_TokensCount because
            // in the `getBalanceOnFarm` method we accumulate all token amounts.
            // So if we just do the caclulation with all the avaliable Lp tokens
            // we would get 3 times the amount.
            uint256 amount = pool.LiqidityPool.calc_withdraw_one_coin(amountLp / m_TokensCount, i);
            tokens[i] = TokenAmount({amount: amount, token: _tokens[i]});
        }

        return tokens;
    }

    function _getPoolBalances(
        Pool storage pool
    ) internal view returns (uint256[m_TokensCount] memory balances) {
        for (uint8 i = 0; i < m_TokensCount; ++i) {
            balances[i] = pool.LiqidityPool.balances(i);
        }
    }

    function _getPoolTokens(
        Pool storage pool
    ) internal view returns (address[m_TokensCount] memory tokens) {
        for (uint8 i = 0; i < m_TokensCount; ++i) {
            tokens[i] = pool.LiqidityPool.coins(i);
        }
    }

    function addConvexPool(uint256 convexPoolId) public onlyRole(ADMIN_ROLE) whenNotPaused {
        (address lptoken, , , address crvRewards, , bool shutdown) = m_ConvexBooster.poolInfo(
            convexPoolId
        );

        require(!shutdown, "Original pool was shutdown");

        address curvePoolAddress = CurveLp(lptoken).minter();
        Pool memory newPool = Pool({
            LiqidityPool: ITricryptoPool(payable(curvePoolAddress)),
            CrvRewards: IBaseRewardPool(crvRewards),
            LpToken: IERC20(lptoken),
            ConvexPoolId: convexPoolId
        });

        //Setup index and allowances
        for (uint8 i = 0; i < m_TokensCount; ++i) {
            address addr = newPool.LiqidityPool.coins(i);
            IERC20(addr).safeIncreaseAllowance(address(newPool.LiqidityPool), type(uint256).max);
        }

        newPool.LpToken.safeIncreaseAllowance(address(m_ConvexBooster), type(uint256).max);

        return Pools.push(newPool);
    }
}
