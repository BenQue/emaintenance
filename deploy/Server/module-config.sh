#!/bin/bash

# E-Maintenance 模块配置管理
# 定义模块依赖关系、健康检查端点和更新策略

# 模块依赖关系映射
declare -A MODULE_DEPENDENCIES=(
    ["web"]="nginx user-service work-order-service asset-service"
    ["user-service"]="postgres redis"
    ["work-order-service"]="postgres redis user-service"
    ["asset-service"]="postgres redis"
    ["nginx"]=""
    ["redis"]=""
    ["postgres"]=""
)

# 模块健康检查端点
declare -A MODULE_HEALTH_ENDPOINTS=(
    ["web"]="/api/health"
    ["user-service"]="/api/health"
    ["work-order-service"]="/api/health"
    ["asset-service"]="/api/health"
    ["nginx"]="/health"
    ["redis"]=""
    ["postgres"]=""
)

# 模块启动等待时间（秒）
declare -A MODULE_STARTUP_WAIT=(
    ["web"]="30"
    ["user-service"]="15"
    ["work-order-service"]="15"
    ["asset-service"]="15"
    ["nginx"]="10"
    ["redis"]="5"
    ["postgres"]="30"
)

# 模块构建上下文路径
declare -A MODULE_BUILD_CONTEXT=(
    ["web"]="."
    ["user-service"]="./apps/api/user-service"
    ["work-order-service"]="./apps/api/work-order-service"
    ["asset-service"]="./apps/api/asset-service"
    ["nginx"]="./deploy/Server/configs/nginx"
)

# 模块Dockerfile路径
declare -A MODULE_DOCKERFILE=(
    ["web"]="apps/web/Dockerfile.prod"
    ["user-service"]="apps/api/user-service/Dockerfile"
    ["work-order-service"]="apps/api/work-order-service/Dockerfile"
    ["asset-service"]="apps/api/asset-service/Dockerfile"
    ["nginx"]="deploy/Server/configs/nginx/Dockerfile"
)

# 模块镜像名称前缀
declare -A MODULE_IMAGE_NAME=(
    ["web"]="emaintenance-web"
    ["user-service"]="emaintenance-user-service"
    ["work-order-service"]="emaintenance-work-order-service"
    ["asset-service"]="emaintenance-asset-service"
    ["nginx"]="emaintenance-nginx"
)

# 模块更新策略
declare -A MODULE_UPDATE_STRATEGY=(
    ["web"]="rolling"          # 滚动更新
    ["user-service"]="rolling"
    ["work-order-service"]="rolling"
    ["asset-service"]="rolling"
    ["nginx"]="recreate"       # 重新创建
    ["redis"]="skip"           # 跳过更新
    ["postgres"]="skip"        # 跳过更新
)

# 获取模块依赖
get_module_dependencies() {
    local module="$1"
    echo "${MODULE_DEPENDENCIES[$module]:-}"
}

# 获取模块健康检查端点
get_module_health_endpoint() {
    local module="$1"
    echo "${MODULE_HEALTH_ENDPOINTS[$module]:-}"
}

# 获取模块启动等待时间
get_module_startup_wait() {
    local module="$1"
    echo "${MODULE_STARTUP_WAIT[$module]:-10}"
}

# 获取模块构建上下文
get_module_build_context() {
    local module="$1"
    echo "${MODULE_BUILD_CONTEXT[$module]:-}"
}

# 获取模块Dockerfile路径
get_module_dockerfile() {
    local module="$1"
    echo "${MODULE_DOCKERFILE[$module]:-}"
}

# 获取模块镜像名称
get_module_image_name() {
    local module="$1"
    echo "${MODULE_IMAGE_NAME[$module]:-}"
}

# 获取模块更新策略
get_module_update_strategy() {
    local module="$1"
    echo "${MODULE_UPDATE_STRATEGY[$module]:-rolling}"
}

# 检查模块是否可更新
is_module_updatable() {
    local module="$1"
    local strategy=$(get_module_update_strategy "$module")
    [[ "$strategy" != "skip" ]]
}

# 按依赖顺序排序模块
sort_modules_by_dependencies() {
    local modules=("$@")
    local sorted_modules=()
    local processed_modules=()
    
    # 简单的拓扑排序实现
    local max_iterations=10
    local iteration=0
    
    while [ ${#sorted_modules[@]} -lt ${#modules[@]} ] && [ $iteration -lt $max_iterations ]; do
        for module in "${modules[@]}"; do
            # 跳过已处理的模块
            if [[ " ${processed_modules[@]} " =~ " $module " ]]; then
                continue
            fi
            
            # 检查依赖是否已满足
            local dependencies=$(get_module_dependencies "$module")
            local deps_satisfied=true
            
            for dep in $dependencies; do
                if [[ " ${modules[@]} " =~ " $dep " ]] && [[ ! " ${processed_modules[@]} " =~ " $dep " ]]; then
                    deps_satisfied=false
                    break
                fi
            done
            
            # 如果依赖已满足，添加到排序列表
            if $deps_satisfied; then
                sorted_modules+=("$module")
                processed_modules+=("$module")
            fi
        done
        
        ((iteration++))
    done
    
    # 如果仍有未处理的模块，按原顺序添加
    for module in "${modules[@]}"; do
        if [[ ! " ${processed_modules[@]} " =~ " $module " ]]; then
            sorted_modules+=("$module")
        fi
    done
    
    echo "${sorted_modules[@]}"
}

# 验证模块配置
validate_module_config() {
    local module="$1"
    local errors=()
    
    # 检查构建上下文是否存在
    local build_context=$(get_module_build_context "$module")
    if [[ -n "$build_context" ]] && [[ ! -d "$build_context" ]]; then
        errors+=("构建上下文不存在: $build_context")
    fi
    
    # 检查Dockerfile是否存在
    local dockerfile=$(get_module_dockerfile "$module")
    if [[ -n "$dockerfile" ]] && [[ ! -f "$dockerfile" ]]; then
        errors+=("Dockerfile不存在: $dockerfile")
    fi
    
    if [ ${#errors[@]} -gt 0 ]; then
        echo "模块 $module 配置错误:"
        printf '  - %s\n' "${errors[@]}"
        return 1
    fi
    
    return 0
}

# 导出所有配置函数
export -f get_module_dependencies
export -f get_module_health_endpoint
export -f get_module_startup_wait
export -f get_module_build_context
export -f get_module_dockerfile
export -f get_module_image_name
export -f get_module_update_strategy
export -f is_module_updatable
export -f sort_modules_by_dependencies
export -f validate_module_config