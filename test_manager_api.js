async function testManagerAPI() {
  try {
    const response = await fetch('http://localhost:3002/api/dashboard/manager-stats');
    const data = await response.json();
    console.log('API 응답:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('오류:', error);
  }
}

testManagerAPI();