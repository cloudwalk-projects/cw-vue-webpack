<template>
  <div>
    <div>this is Header</div>
    <div v-bind="model1">{{text}}</div>
  </div>
</template>
<style>
#header {
  width: 100px;
}
</style>
<script>
export default {
  // 定义模板变量
  // template,
  data() {
    return {
      msg: 'hello vue'
    }
  },
  components: {}
}
</script>

