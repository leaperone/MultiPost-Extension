# 用户管理页无限滚动分页实现说明

## 目标
实现"用户管理"页面的用户列表支持无限滚动加载（Infinite Pagination），提升大数据量下的性能和用户体验。

## 主要改动

### 1. 后端 Server Action 支持分页
- `getUsers` 方法支持 `cursor` 和 `limit` 参数，返回 `{ users, count, nextCursor }`。
- 分页基于用户 `id` 递减游标，适合无限滚动场景。

### 2. 前端 UserTable 组件
- 使用 `useAsyncList` 和 `useInfiniteScroll` 实现自动分页加载。
- 组件内部直接调用 server action `getUsers`，不再通过 API route。
- 支持 loading、hasMore、loadMore 状态，体验流畅。

### 3. 页面集成
- `AdminUserPage` 只负责获取总用户数（count），渲染 `<UserTable />`。
- 用户列表滚动时自动加载更多，无需手动翻页。

## 代码片段

#### getUsers (actions.ts)
```typescript
export async function getUsers({ cursor, limit = 20 }: GetUsersParams = {}): Promise<RespT<GetUsersResult>> {
  // ...权限校验...
  const where = cursor ? { id: { lt: cursor } } : {};
  const users = await prisma.user.findMany({ where, orderBy: { id: 'desc' }, take: limit });
  const count = await prisma.user.count();
  const nextCursor = users.length === limit ? users[users.length - 1].id : undefined;
  return { code: 0, msg: 'success', data: { users, count, nextCursor } };
}
```

#### UserTable (UserTable.tsx)
```tsx
const list = useAsyncList<User, string>({
  async load({ cursor }) {
    const resp = await getUsers({ cursor, limit: 20 });
    return {
      items: resp.data.users,
      cursor: resp.data.nextCursor,
    };
  },
});
```

## 注意事项
- 不再依赖 API route，所有分页数据通过 server action 获取。
- 组件需为 client 组件。
- 若需调整每页数量，可修改 `limit` 参数。

---
如需进一步扩展或自定义分页逻辑，请参考上述实现方式。 