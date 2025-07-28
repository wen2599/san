import React, { useState } from 'react';
import { Button, Container, Typography, Box, Stack, CircularProgress } from '@mui/material';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';

import { useGame } from '../context/GameContext';
import PlayerStatus from '../components/PlayerStatus';
import { DroppableRow } from '../components/DroppableRow';
import { DraggableCard } from '../components/DraggableCard';
import { validateArrangement, sortCardsByRank, findCardInRows } from '../utils/thirteenLogic';
import '../styles/App.css';

const API_URL = 'https://9525.ip-ddns.com/api/deal.php';

function ThirteenGamePage() {
    const navigate = useNavigate();
    const { players, isGameActive, startGame, updatePlayerRows, autoArrangePlayerHand, setPlayerReady, calculateResults } = useGame();
    
    // 【终极修正 1】: 只保留与UI交互直接相关的、临时的本地状态。
    // 所有核心数据（牌的位置）都从 context 中获取。
    const [selectedCardIds, setSelectedCardIds] = useState([]);
    const [activeDragId, setActiveDragId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // 从 context 中派生出当前玩家的数据，这是唯一的数据源。
    const player = players.find(p => p.id === 'player');
    const rows = player?.rows || { front: [], middle: [], back: [] }; // 如果player不存在，提供默认空值
    const validationResult = player ? validateArrangement(player.rows) : null;

    // 【终极修正 2】: 传感器配置，这是正确的。
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    const handleDealCards = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            if (data.success && data.hand.length === 52) {
                startGame(data.hand);
            } else {
                throw new Error('获取的牌数不足52张');
            }
        } catch(e) {
            console.error("发牌失败:", e);
        } finally {
            setIsLoading(false);
        }
    };
    
    // 这个函数的功能是根据当前的 rows 状态找到卡片所在的牌墩ID
    const findContainerIdForCard = (cardId, currentRows) => {
        for (const rowId in currentRows) {
            if (currentRows[rowId].some(card => card.id === cardId)) return rowId;
        }
        return null;
    };
    
    const handleCardClick = (cardId, rowId, event) => {
        event.stopPropagation();
        if (event.ctrlKey || event.metaKey) {
            setSelectedCardIds(prev => prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]);
        } else {
            setSelectedCardIds(prev => (prev.length === 1 && prev[0] === cardId) ? [] : [cardId]);
        }
    };
    
    const handleDragStart = (event) => {
        setActiveDragId(event.active.id);
        if (!selectedCardIds.includes(event.active.id)) {
            setSelectedCardIds([event.active.id]);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over) {
            setSelectedCardIds([]);
            return;
        }
        
        // 【终极修正 3】: 整个拖拽逻辑在一个函数内完成，使用当前最新的`rows`状态，不依赖任何闭包或异步状态
        const currentRows = player.rows;
        
        const overContainerId = over.id in currentRows ? over.id : findContainerIdForCard(over.id, currentRows);
        if (!overContainerId) {
             setSelectedCardIds([]);
             return;
        }

        const itemsToMoveIds = selectedCardIds.length > 0 && selectedCardIds.includes(active.id) ? [...selectedCardIds] : [active.id];
        
        let newRows = JSON.parse(JSON.stringify(currentRows));
        const movedCardsData = [];

        itemsToMoveIds.forEach(id => {
            const containerId = findContainerIdForCard(id, currentRows);
            if (containerId) {
                const cardIndex = newRows[containerId].findIndex(c => c.id === id);
                if (cardIndex !== -1) {
                    movedCardsData.push(newRows[containerId][cardIndex]);
                    newRows[containerId].splice(cardIndex, 1);
                }
            }
        });
        
        const overCardIndex = newRows[overContainerId].findIndex(c => c.id === over.id);
        const insertIndex = overCardIndex !== -1 ? overCardIndex : newRows[overContainerId].length;
        newRows[overContainerId].splice(insertIndex, 0, ...movedCardsData);
        
        const limits = { front: 3, middle: 5, back: 5 };
        if (newRows.front.length > limits.front || newRows.middle.length > limits.middle || newRows.back.length > limits.back) {
            setSelectedCardIds([]);
            return;
        }
        
        newRows[overContainerId] = sortCardsByRank(newRows[overContainerId]);
        
        // 一次性调用Context的函数更新全局状态
        updatePlayerRows(newRows);
        setSelectedCardIds([]);
    };

    const handleStartComparison = () => {
        if (validationResult?.isValid) {
            const updatedPlayers = setPlayerReady();
            if (calculateResults(updatedPlayers)) {
                navigate('/comparison');
            }
        } else {
            alert(validationResult?.message || "牌型不合法，请调整后再试。");
        }
    };

    if (!isGameActive) {
        return (
             <Container className="page-container">
                <Button variant="contained" size="large" onClick={handleDealCards} disabled={isLoading}>
                    {isLoading ? <CircularProgress size={24} color="inherit"/> : "开始四人牌局"}
                </Button>
            </Container>
        )
    }

    const activeCardForOverlay = activeDragId ? findCardInRows(rows, activeDragId) : null;
    const selectedCardsForOverlay = selectedCardIds.map(id => findCardInRows(rows, id)).filter(Boolean);
    const overlayCards = selectedCardsForOverlay.length > 0 ? selectedCardsForOverlay : (activeCardForOverlay ? [activeCardForOverlay] : []);

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Box className="page-container-new-ui">
                <Box className="game-board glass-effect">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}>
                        <Button variant="contained" sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}>退出房间</Button>
                        <Typography variant="h6">
                            <span role="img" aria-label="coin" style={{marginRight: '8px'}}>🪙</span>
                            积分: 100
                        </Typography>
                    </Box>
                    <PlayerStatus />
                    <Stack spacing={2} sx={{ flexGrow: 1, justifyContent: 'center' }}>
                        <DroppableRow id="front" label="头道 (3)" cards={rows.front} selectedCardIds={selectedCardIds} onCardClick={handleCardClick} />
                        <DroppableRow id="middle" label="中道 (5)" cards={rows.middle} selectedCardIds={selectedCardIds} onCardClick={handleCardClick} />
                        <DroppableRow id="back" label="后道 (5)" cards={rows.back} selectedCardIds={selectedCardIds} onCardClick={handleCardClick} />
                    </Stack>
                    <Stack direction="row" spacing={2} justifyContent="center" sx={{ p: 2 }}>
                        <Button variant="contained" color="secondary" sx={{ opacity: 0.8 }}>取消准备</Button>
                        <Button variant="contained" color="primary" onClick={autoArrangePlayerHand}>智能分牌</Button>
                        <Button variant="contained" sx={{ bgcolor: '#f57c00' }} onClick={handleStartComparison}>开始比牌</Button>
                    </Stack>
                </Box>
            </Box>
            <DragOverlay dropAnimation={null}>
                {activeDragId && overlayCards.length > 0 ? (
                    <div style={{ display: 'flex', transform: 'rotate(-5deg)'}}>
                       {overlayCards.map((card, index) => (
                           <div key={card.id} className="poker-card" style={{ marginLeft: index > 0 ? '-55px' : 0 }}>
                               <img src={`/assets/cards/${card.id}.svg`} alt={card.displayName} />
                           </div>
                       ))}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

export default ThirteenGamePage;
