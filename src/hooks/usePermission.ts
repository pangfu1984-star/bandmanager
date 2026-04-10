import { useMemberStore } from '@/store/useMemberStore'
import type { PermissionAction } from '@/types'

export function usePermission() {
  // 订阅 currentMemberId 和 members 的变化，确保权限实时更新
  const currentMemberId = useMemberStore(s => s.currentMemberId)
  const members = useMemberStore(s => s.members)
  const currentMember = members.find(m => m.id === currentMemberId)

  const isAdmin = currentMember?.role === 'admin'

  function can(action: PermissionAction, context?: {
    resourceCreatorId?: string
    assigneeId?: string
  }): boolean {
    if (!currentMember) return false
    if (isAdmin) return true

    switch (action) {
      case 'edit_band_info':
      case 'manage_members':
      case 'manage_scores':
      case 'manage_setlists':
      case 'manage_backup':
      case 'delete_others_task':
        return false

      case 'create_event':
      case 'create_task':
        return true

      case 'edit_any_event':
      case 'delete_any_event':
        // 普通成员只能编辑/删除自己创建的日程
        return context?.resourceCreatorId === currentMember.id

      case 'complete_any_task':
        // 普通成员只能完成自己创建或被指派的任务
        return (
          context?.resourceCreatorId === currentMember.id ||
          context?.assigneeId === currentMember.id
        )

      case 'add_score_to_setlist':
        return true

      default:
        return false
    }
  }

  function assert(action: PermissionAction, context?: { resourceCreatorId?: string; assigneeId?: string }): void {
    if (!can(action, context)) {
      throw new Error('权限不足，无法执行此操作')
    }
  }

  return { can, assert, isAdmin, currentMember }
}
