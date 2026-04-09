import { describe, it, expect } from 'vitest'
import { calcCompletionRate, checkTimeConflict, isOverdue } from '@/lib/utils'

describe('calcCompletionRate', () => {
  it('空任务返回 0', () => {
    expect(calcCompletionRate(0, 0)).toBe(0)
  })

  it('全部完成返回 100', () => {
    expect(calcCompletionRate(5, 5)).toBe(100)
  })

  it('一半完成返回 50', () => {
    expect(calcCompletionRate(4, 2)).toBe(50)
  })

  it('向下取整', () => {
    expect(calcCompletionRate(3, 1)).toBe(33)
  })
})

describe('checkTimeConflict', () => {
  const t = (h: number, m = 0) => new Date(2026, 0, 1, h, m).getTime()

  it('时间重叠返回 true', () => {
    expect(checkTimeConflict(t(10), t(12), t(11), t(13))).toBe(true)
  })

  it('包含关系返回 true', () => {
    expect(checkTimeConflict(t(9), t(17), t(10), t(12))).toBe(true)
  })

  it('不重叠返回 false', () => {
    expect(checkTimeConflict(t(9), t(11), t(11), t(13))).toBe(false)
  })

  it('完全不重叠返回 false', () => {
    expect(checkTimeConflict(t(9), t(10), t(12), t(13))).toBe(false)
  })
})

describe('isOverdue', () => {
  it('过去时间是逾期', () => {
    expect(isOverdue(Date.now() - 1000)).toBe(true)
  })

  it('未来时间不是逾期', () => {
    expect(isOverdue(Date.now() + 1000 * 60 * 60)).toBe(false)
  })

  it('无效时间不是逾期', () => {
    expect(isOverdue(NaN)).toBe(false)
  })
})

describe('权限规则', () => {
  const adminMember = { id: 'admin1', role: 'admin' as const, bandId: 'b1', name: 'Admin', instrument: '', createdAt: 0 }
  const normalMember = { id: 'user1', role: 'member' as const, bandId: 'b1', name: 'User', instrument: '', createdAt: 0 }

  function checkPermission(member: typeof adminMember, action: string, context?: { resourceCreatorId?: string; assigneeId?: string }): boolean {
    const isAdmin = member.role === 'admin'
    if (isAdmin) return true
    switch (action) {
      case 'edit_band_info':
      case 'manage_members':
      case 'manage_backup':
        return false
      case 'create_event':
      case 'create_task':
        return true
      case 'edit_any_event':
      case 'delete_any_event':
        return context?.resourceCreatorId === member.id
      case 'complete_any_task':
        return context?.resourceCreatorId === member.id || context?.assigneeId === member.id
      default:
        return false
    }
  }

  it('管理员可以执行所有操作', () => {
    expect(checkPermission(adminMember, 'edit_band_info')).toBe(true)
    expect(checkPermission(adminMember, 'manage_members')).toBe(true)
    expect(checkPermission(adminMember, 'delete_any_event')).toBe(true)
  })

  it('普通成员不能编辑乐队信息', () => {
    expect(checkPermission(normalMember, 'edit_band_info')).toBe(false)
  })

  it('普通成员不能管理成员', () => {
    expect(checkPermission(normalMember, 'manage_members')).toBe(false)
  })

  it('普通成员只能编辑自己创建的日程', () => {
    expect(checkPermission(normalMember, 'edit_any_event', { resourceCreatorId: 'user1' })).toBe(true)
    expect(checkPermission(normalMember, 'edit_any_event', { resourceCreatorId: 'other' })).toBe(false)
  })

  it('普通成员只能完成自己的或被指派的任务', () => {
    expect(checkPermission(normalMember, 'complete_any_task', { assigneeId: 'user1' })).toBe(true)
    expect(checkPermission(normalMember, 'complete_any_task', { resourceCreatorId: 'user1' })).toBe(true)
    expect(checkPermission(normalMember, 'complete_any_task', { resourceCreatorId: 'other', assigneeId: 'other' })).toBe(false)
  })

  it('普通成员可以创建任务', () => {
    expect(checkPermission(normalMember, 'create_task')).toBe(true)
  })
})
