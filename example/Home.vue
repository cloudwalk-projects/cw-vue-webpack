<template>
  <div>
    <div>this is Header</div>
    <div v-bind="model1">{{text}}</div>
  </div>
</template>
<script>
import header from './includes/header.vue';

export default {
  data() {
    return {
      msg: 'hello vue'
    }
  },
  components: {}
}
</script>

<style scoped>
.table-header {
  color:#ffffff;
}
#header {
  width: 100px;
}
</style>
