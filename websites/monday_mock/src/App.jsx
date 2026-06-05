import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { useAppContext } from './context/AppContext';
import BoardHeader from './components/BoardHeader';
import GroupSection from './components/board/GroupSection';
import Go from './pages/Go';

function RedirectWithQuery({ to }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  return <Navigate to={query ? `${to}?${query}` : to} replace />;
}

function MyWork() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const currentUser = state.users[state.currentUserId];
  const assignedItems = Object.values(state.items).filter(item => {
    const board = state.boards[item.boardId];
    if (!board || item.archivedAt) return false;
    if (item.creatorId === state.currentUserId) return true;
    return board.columnIds.some(columnId => {
      const column = state.columns[columnId];
      const value = item.columnValues?.[columnId]?.value;
      return column?.type === 'people' && Array.isArray(value) && value.includes(state.currentUserId);
    });
  });

  const grouped = assignedItems.reduce((acc, item) => {
    const board = state.boards[item.boardId];
    if (!board) return acc;
    if (!acc[board.id]) acc[board.id] = { board, items: [] };
    acc[board.id].items.push(item);
    return acc;
  }, {});

  const openItem = (item) => {
    dispatch({ type: 'SET_ACTIVE_BOARD', payload: { boardId: item.boardId } });
    dispatch({ type: 'SET_ITEM_DETAIL', payload: item.id });
    navigate(`/board/${item.boardId}`);
  };

  return (
    <div className="my-work-page">
      <div className="my-work-header">
        <h1>My Work</h1>
        <p>Items assigned to or created by {currentUser?.name || 'you'} across all boards</p>
      </div>
      {assignedItems.length === 0 ? (
        <div className="my-work-empty">You're all caught up.</div>
      ) : (
        Object.values(grouped).map(({ board, items }) => (
          <section key={board.id} className="my-work-section">
            <div className="my-work-section-title">
              <span className="my-work-board-dot" />
              {board.name}
              <span>{items.length}</span>
            </div>
            <div className="my-work-list">
              {items.map(item => {
                const group = state.groups[item.groupId];
                const statusColumnId = board.columnIds.find(id => state.columns[id]?.type === 'status');
                const status = statusColumnId ? state.columns[statusColumnId]?.settings?.labels?.[item.columnValues?.[statusColumnId]?.value] : null;
                const dateColumnId = board.columnIds.find(id => state.columns[id]?.type === 'date');
                const dueDate = dateColumnId ? item.columnValues?.[dateColumnId]?.value : null;
                return (
                  <button key={item.id} className="my-work-row" onClick={() => openItem(item)}>
                    <span className="my-work-row-name">{item.name || '(unnamed)'}</span>
                    <span className="my-work-row-group" style={{ color: group?.color }}>{group?.title}</span>
                    {status && <span className="my-work-status" style={{ background: status.color }}>{status.text}</span>}
                    <span className="my-work-date">{dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function AppSidebar() {
  const { state, dispatch } = useAppContext();
  const location = useLocation();
  const search = location.search || '';
  const workspace = state.workspaces[state.activeWorkspaceId] || Object.values(state.workspaces)[0];
  const boards = (workspace?.boardIds || []).map(boardId => state.boards[boardId]).filter(Boolean);
  const currentUser = state.users[state.currentUserId];

  return (
    <div className="w-64 h-screen bg-[#2b2c33] text-white flex flex-col flex-shrink-0">
      <div className="p-4 flex items-center gap-2 border-b border-gray-700">
        <div className="w-8 h-8 bg-brand rounded flex items-center justify-center font-bold text-xl">
          {workspace?.icon || 'M'}
        </div>
        <span className="font-bold text-lg tracking-tight">xonday.com</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-6">
          <div className="text-xs text-gray-400 font-semibold mb-2 uppercase">Workspace</div>
          <div className="flex items-center gap-2 p-2 bg-gray-700 rounded">
            <span className="text-sm font-medium truncate">{workspace?.name || 'Workspace'}</span>
          </div>
        </div>

        <div className="px-2">
          <div className="px-2 text-xs text-gray-400 font-semibold mb-2 uppercase">Boards</div>
          {boards.map(board => (
            <Link
              key={board.id}
              to={`/board/${board.id}${search}`}
              onClick={() => dispatch({ type: 'SET_ACTIVE_BOARD', payload: { boardId: board.id } })}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                location.pathname.includes(board.id) ? 'bg-primary text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="truncate">{board.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center text-xs font-bold"
            style={{ background: currentUser?.color || '#0073EA' }}
          >
            {currentUser?.initials || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{currentUser?.name || 'User'}</div>
            <div className="text-xs text-gray-400">Online</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardWorkspace() {
  const { boardId } = useParams();
  const { state, dispatch } = useAppContext();
  const board = state.boards[boardId];

  useEffect(() => {
    if (boardId && boardId !== state.ui.activeBoardId) {
      dispatch({ type: 'SET_ACTIVE_BOARD', payload: { boardId } });
    }
  }, [boardId, dispatch, state.ui.activeBoardId]);

  if (!board) {
    return <div className="p-10">Board not found</div>;
  }

  const columns = board.columnIds
    .map(columnId => state.columns[columnId])
    .filter(column => column && !(state.ui.hiddenColumnsByBoard?.[board.id] || []).includes(column.id));
  const query = (state.ui.searchQuery || '').trim().toLowerCase();
  const groups = board.groupIds.map(groupId => state.groups[groupId]).filter(Boolean);

  return (
    <div className="h-full flex flex-col bg-white">
      <BoardHeader boardId={board.id} />
      <div className="flex-1 overflow-auto bg-surface-gray">
        <div className="p-8 pb-20">
          {groups.map(group => {
            const items = group.itemIds
              .map(itemId => state.items[itemId])
              .filter(item => item && !item.archivedAt)
              .filter(item => !query || item.name.toLowerCase().includes(query));
            return (
              <GroupSection
                key={group.id}
                group={group}
                items={items}
                board={board}
                columns={columns}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/go" element={<Go />} />
          <Route path="*" element={
            <div className="app-layout">
              <AppSidebar />
              <div className="main-content">
                <Routes>
                  <Route path="/" element={<RedirectWithQuery to="/board/board-1" />} />
                  <Route path="/board/:boardId" element={<BoardWorkspace />} />
                  <Route path="/my-work" element={<MyWork />} />
                </Routes>
              </div>
            </div>
          } />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
