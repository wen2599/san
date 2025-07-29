import React, { useState, useEffect } from 'react';
import { Button, Container, Typography, Box, Stack, CircularProgress } from '@mui/material';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { useLocation, useNavigate } from 'react-router-dom';

import { useGame } from '../context/GameContext';
import PlayerStatus from '../components/PlayerStatus';
import { DroppableRow } from '../components/DroppableRow';
import { validateArrangement, sortCardsByRank, findCardInRows } from '../utils/thirteenLogic';
import '../styles/App.css';

function ThirteenGamePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { players, isGameActive, startOfflineGame, resetGame, updatePlayerRows, autoArrangePlayerHand, setPlayerReady, calculateResults } = useGame();
    
    const [selectedCardIds, setSelectedCardIds] = useState([]);
    const [activeDragId, setActiveDragId] = useState(null);
    
    const player = players.find(p => p.id === 'player');
    const rows = player?.rows || { front: [], middle: [], back: [] };
    const validationResult = player ? validateArrangement(player.rows) : null;

    useEffect(() => {
        if (location.state?.mode === 'offline') {
            startOfflineGame();
        }
        
        return () => {
            resetGame();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleExitGame = () => {
        navigate('/');
    };
    
    const handleStartComparison = () => {
        if (validationResult?.isValid) {
            const updatedPlayers = setPlayerReady();
            if (calculateResults(updatedPlayers)) {
                navigate('/thirteen/comparison');
            }
        } else {
            alert(validationResult?.message || "牌型不合法，请调整后再试。");
        }
    };
    
    if (!isGameActive || !player) {
        return (
             <Container className="page-container">
                <CircularProgress />
                <Typography sx={{color: 'white', mt: 2}}>正在创建十三张牌局...</Typography>
            </Container>
        )
    }

    // ... (拖拽等其他逻辑保持不变)
    const activeCardForOverlay = activeDragId ? findCardInRows(rows, activeDragId) : null;
    const handleCardClick = (cardId) => setSelectedCardIds(prev => prev.includes(cardId) ? [] : [cardId]);
    const handleDragStart = (event) => setActiveDragId(event.active.id);
    const handleDragEnd = (event) => { 
        const { active, over } = event;
        setActiveDragId(null);
        if (!over || !player) return;
        
        const currentRows = player.rows;
        let newRows = JSON.parse(JSON.stringify(currentRows));
        
        const sourceRowId = Object.keys(currentRows).find(key => currentRows[key].some(c => c.id === active.id));
        const cardToMove = sourceRowId ? currentRows[sourceRowId].find(c => c.id === active.id) : null;

        if (!sourceRowId || !cardToMove) return;

        newRows[sourceRowId] = newRows[sourceRowId].filter(c => c.id !== active.id);
        
        const overRowId = over.id in newRows ? over.id : Object.keys(newRows).find(key => newRows[key].some(c => c.id === over.id));
        if (newRows[overRowId]) {
             newRows[overRowId].push(cardToMove);
             newRows[overRowId] = sortCardsByRank(newRows[overRowId]);
        }
        
        updatePlayerRows(newRows);
        setSelectedCardIds([]);
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {/* 【核心修改 1】: 将 page-container 替换为 page-container-new-ui 以实现全屏布局 */}
            <Box className="page-container-new-ui">
                {/* 【核心修改 2】: 增加 glass-effect 类以获得毛玻璃背景效果 */}
                <Box className="game-board glass-effect">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}>
                        <Button
                            variant="contained"
                            onClick={handleExitGame}
                            sx={{
                                bgcolor: 'error.main', // 使用主题颜色更统一
                                '&:hover': { bgcolor: 'error.dark' }
                            }}
                        >
                            退出游戏
                        </Button>
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, p: '4px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '20px'}}>
                            <Typography sx={{ color: '#ffd700', fontSize: '20px' }}>🪙</Typography>
                            <Typography>积分: 100</Typography>
                        </Box>
                    </Box>

                    <PlayerStatus players={players} />

                    <Stack spacing={2} sx={{ flexGrow: 1, justifyContent: 'center' }}>
                        <DroppableRow id="front" label="头道 (3)" cards={rows.front} selectedCardIds={selectedCardIds} onCardClick={handleCardClick} />
                        <DroppableRow id="middle" label="中道 (5)" cards={rows.middle} selectedCardIds={selectedCardIds} onCardClick={handleCardClick} />
                        <DroppableRow id="back" label="后道 (5)" cards={rows.back} selectedCardIds={selectedCardIds} onCardClick={handleCardClick} />
                    </Stack>
                    
                    <Stack direction="row" spacing={2} justifyContent="center" sx={{ p: 2 }}>
                        <Button variant="contained" color="primary" onClick={autoArrangePlayerHand}>智能分牌</Button>
                        <Button variant="contained" color="success" onClick={handleStartComparison}>开始比牌</Button>
                    </Stack>
                </Box>
            </Box>
            <DragOverlay>
                {activeCardForOverlay ? (
                    <div className="poker-card" style={{ width: '120px', height: '168px' }}>
                         <img src={`/assets/cards/${activeCardForOverlay.id}.svg`} alt="card" style={{width: '100%', height: '100%'}}/>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

export default ThirteenGamePage;
